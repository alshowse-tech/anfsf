import { Router } from 'express';
import { handleGetAllUsers, handleGetUserById, handleCreateUser, handleUpdateUser, handleDeleteUser } from '../controllers/userController';

const router = Router();

// TODO: implement authentication middleware
router.get('/', handleGetAllUsers);
router.get('/:id', handleGetUserById);
router.post('/', handleCreateUser);
router.put('/:id', handleUpdateUser);
router.delete('/:id', handleDeleteUser);

export default router;