#!/bin/bash

## DOCKER
apt-get -y install docker.io
# Add vagrant to docker group so accessible within galaxy
usermod -a -G docker vagrant

## NODE/Zombie/PhantomJS
apt-get -y install software-properties-common
yes | add-apt-repository ppa:chris-lea/node.js
apt-get update
apt-get -y install nodejs python-yaml
sudo npm install -g phantomjs casperjs

## GALAXY
wget --no-clobber https://bitbucket.org/galaxy/galaxy-central/get/tip.tar.gz -O /tmp/tip.tar.gz
cd /home/vagrant/
if [ ! -d "galaxy" ];
then
    tar xvfz /tmp/tip.tar.gz
    rm -rf galaxy/
    mv galaxy-galaxy-* galaxy
    chown vagrant: -R /home/vagrant/galaxy/
fi
cd galaxy
# Don't care that it exits 1
result=$(sh run.sh --stop-daemon)
wget https://github.com/jmchilton/galaxy-downloads/blob/master/db_gx_rev_0120.sqlite?raw=true -O /home/vagrant/galaxy/database/universe.sqlite
sh manage_db.sh -c ./universe_wsgi.ini upgrade


cp /vagrant/galaxy/* /home/vagrant/galaxy/

# Create user
python create_galaxy_user.py --user admin@local.host --password password

## UWSGI + Nginx
apt-get install -y uwsgi uwsgi-plugin-python supervisor nginx python-virtualenv
sudo update-rc.d -f uwsgi remove
if [ ! -d "/home/vagrant/venv" ];
then
    virtualenv /home/vagrant/venv/
fi
chown vagrant: -R /home/vagrant/


# Static Files
cp /vagrant/index.html /usr/share/nginx/html/index.html
cp /vagrant/conf/nginx.conf /etc/nginx/sites-enabled/default
cp /vagrant/conf/supervisor.conf /etc/supervisor/conf.d/galaxy.conf
service nginx restart

# Make sure everything is supervised
service supervisor restart
