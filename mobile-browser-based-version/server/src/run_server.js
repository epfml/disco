import models from './tasks/models.js';
import express from 'express';
import cors from 'cors';
import { federatedRouter, decentralisedRouter } from './router/router.js';
import * as config from '../server.config.js';

const app = express();
app.enable('trust proxy');
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.listen(config.SERVER_PORT);

// Asynchronously create and save Tensorflow models to local storage
Promise.all(models.map((createModel) => createModel()));

// Configure server routing
app.use('/FeAI', federatedRouter);
app.use('/DeAI', decentralisedRouter);
app.get('/', (req, res) => res.send('Server for DeAI & FeAI'));

export default app;
