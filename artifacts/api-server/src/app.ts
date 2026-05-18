import express, { type Request, type Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  pinoHttp({
    transport: {
      target: 'pino-pretty',
    },
  })
);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
  });
});

export default app;
