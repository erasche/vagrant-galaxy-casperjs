#!/bin/bash
wget --no-clobber https://bitbucket.org/galaxy/galaxy-dist/get/latest_2014.08.11.tar.gz -O /tmp/latest_2014.08.11.tar.gz
cd /home/vagrant/
if [ ! -d "galaxy" ];
then
    tar xvfz /tmp/latest_2014.08.11.tar.gz
    mv galaxy-galaxy-dist-0047ee06fef0 galaxy
    chown vagrant: -R /home/vagrant/galaxy/
fi
cd galaxy
# Don't care that it exits one
result=$(sh run.sh --stop-daemon)
cp /vagrant/*.ini /home/vagrant/galaxy/