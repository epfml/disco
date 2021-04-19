# Basic syft.js Tutorial (summary)

## **NOTE**
The `PySyft` codebase underwent significant changes around 27/11/2020. This tutorial refers to `PySyft` version `0.2.x`, which is now obsolete.

You can still use the old codebase with `PySyft 0.2.x`, which is found here: https://github.com/OpenMined/PySyft/tree/syft_0.2.x. To clone it locally:

```bash
git clone https://github.com/OpenMined/PySyft

cd PySyft
git checkout -b syft_0.2.x --track origin/syft_0.2.x
```
The old codebase will now be in your local branch `syft_0.2.x`.

## Prerequisites

Grab the Git repositories (**see note above on `PySyft`!**).
```bash
# syft.js
git clone https://github.com/openmined/syft.js 
# PySyft
git clone https://github.com/OpenMined/PySyft 
# PyGrid
git clone https://github.com/OpenMined/PyGrid
```

Set up a `conda` environment
```bash
conda create -n syft python=3.7
conda activate syft
conda install jupyter notebook==5.7.8 tornado==4.5.3
```

Install PySyft
```bash
# Don't forget the version number, which refers
# to the old codebase
pip install 'syft[udacity]==0.2.9'
```

To test PyGrid locally on a dummy cluster, insert this in your `/etc/hosts` file

```
127.0.0.1 network
127.0.0.1 alice
127.0.0.1 bob
127.0.0.1 charlie
127.0.0.1 dan
```

Finally, you need to install [npm](https://www.npmjs.com/get-npm) to test the `syft.js` example.

## Demo

1. Start Docker
1. Start PyGrid
```bash
cd PyGrid
docker-compose up --build
```
If you want to restart the grid, you can run `docker-compose up --force-recreate`.


2. Execute the PySyft Jupyter notebook at `PySyft/examples/tutorials/model-centric-fl/Part 01 - Create Plan.ipynb`.

3. Install `syft.js` dependencies
```bash
cd syft.js
npm install
cd examples/mnist
npm install
```

Check the warnings - you might need to install some extra dependencies with `npm`.

4. Start the demo with `npm start`.