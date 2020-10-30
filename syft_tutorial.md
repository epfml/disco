# Basic syft.js Tutorial (summary)

## Prerequisites

Grab the Git repositories:
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
pip install 'syft[udacity]'
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