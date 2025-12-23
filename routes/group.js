import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupsByUser,
  addExpense,
  getGroupBalances,
  settleGroup
} from '../controllers/group.js';

const router = Router();

router.post('/creategroup', createGroup);
router.get('/getgroups', getGroups);
router.get('/getgroups/:userId', getGroupsByUser);
router.post('/addexpense', addExpense);
router.get('/:groupId/balances', getGroupBalances);
router.get('/:groupId/settle', settleGroup);
export default router;