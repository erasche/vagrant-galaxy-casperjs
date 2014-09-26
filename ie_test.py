#!/usr/bin/env python
from subprocess import call
import yaml
import sys
import os
import subprocess

with open(sys.argv[1], 'r') as handle:
    data = yaml.load(handle)

docker_image = data['docker_image_repository']
viz_plugin = data['viz_plugin_repository']
viz_dir = "/home/vagrant/galaxy/config/plugins/visualizations/"
name = data['name']
path = name.lower()

# Handle docker image
call(["git", "clone", docker_image, "/tmp/ie-docker-image"])
os.chdir("/tmp/ie-docker-image")
call(["sed", "-i", "s/ tornado / 'tornado<4' /g", "Dockerfile"])
call(["docker.io", "build", '-t', 'ie', '.'])

# Handle viz plugin
os.chdir(viz_dir)
plugin_path = os.path.join(viz_dir, path)
# Remove first so git doesn't complain
call(["rm", "-rf", plugin_path])
# Then re-clone
call(["git", "clone", viz_plugin, plugin_path])

# Configure viz plugin
conf_file = os.path.join(plugin_path, 'config', 'ipython.conf')
if not os.path.exists("/vagrant/out/"):
    os.makedirs("/vagrant/out/")

for test_case in data['conf']['test']:
    with open(conf_file, 'w') as handle:
        for section in test_case:
            handle.write("[%s]\n" % section)
            for variable in test_case[section]:
                handle.write("%s = %s\n" % (variable,
                                            test_case[section][variable]))
        # Handle docker automatically
        handle.write("[docker]\n")
        handle.write("command = docker.io\n")  # ubuntu specific
        handle.write("image = ie\n")
    subprocess.check_call(["casperjs", "test",
                           "/vagrant/util/casper-phantom-tests.js",
                           "--xunit=/vagrant/out/" + test_case.keys()[0] +
                           ".xml"])
