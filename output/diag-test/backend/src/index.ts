// [generated]
import express from 'express';
import cors from 'cors';
import { userRouter } from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
