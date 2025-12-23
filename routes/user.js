import { Router } from 'express';
import { createUser,getBalances,createUsers, getUsers, getUser } from '../controllers/user.js';

const router = Router();

// Create user
router.post('/createuser', createUser);

// Get all users
router.get('/getusers', getUsers);
router.post('/createusers', createUsers); // new route for multiple users
router.get('/balances', getBalances); // new route for multiple users
// Get specific user by ID
router.get('/getuser/:userId', getUser);

export default router;
