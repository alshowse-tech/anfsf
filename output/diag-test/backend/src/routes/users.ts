// [generated]
import { Router } from 'express';
import { UserController } from '../controllers/userController';

export const userRouter = Router();

const controller = new UserController();

userRouter.get('/', controller.getAll);
userRouter.get('/:id', controller.getById);
userRouter.post('/', controller.create);
userRouter.put('/:id', controller.update);
userRouter.delete('/:id', controller.delete);
