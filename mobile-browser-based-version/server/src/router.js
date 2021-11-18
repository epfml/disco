import express from 'express';
import * as requests from './request_handlers/feai_handlers/requests.js';

const feaiRouter = express.Router();
feaiRouter.get('/', (req, res) => res.send('FeAI server'));

feaiRouter.get('/connect/:task/:id', requests.connectToServer);
feaiRouter.get('/disconnect/:task/:id', requests.disconnectFromServer);

feaiRouter.post('/send_weights/:task/:round', requests.sendIndividualWeights);
feaiRouter.post(
  '/receive_weights/:task/:round',
  requests.receiveAveragedWeights
);

feaiRouter.post('/send_nbsamples/:task/:round', requests.sendDataSamplesNumber);
feaiRouter.post(
  '/receive_nbsamples/:task/:round',
  requests.receiveDataSamplesNumbersPerClient
);

const feaiTasksRouter = express.Router();
feaiTasksRouter.get('/', requests.getAllTasksData);
feaiTasksRouter.get('/:task/:file', requests.getInitialTaskModel);
feaiRouter.use('/tasks', feaiTasksRouter);

feaiTasksRouter.get('/logs', requests.queryLogs);

const deaiRouter = express.Router();

export { feaiRouter, deaiRouter };
