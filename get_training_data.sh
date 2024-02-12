#!/bin/sh
DIR="$( cd "$( dirname "$0" )" ; pwd -P )"
ARCHIVE="example_training_data.tar.gz"

cd $DIR
curl -L "http://deai-313515.appspot.com.storage.googleapis.com/$ARCHIVE" -o $ARCHIVE
tar -xf $ARCHIVE
