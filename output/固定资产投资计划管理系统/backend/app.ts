import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);



app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
