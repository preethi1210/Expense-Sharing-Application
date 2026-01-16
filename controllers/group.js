import Group from '../models/group.js';
import User from '../models/user.js';
import Expense from '../models/expense.js';
/* ---------------- CREATE GROUP ---------------- */
export const createGroup = async (req, res) => {
  try {
    const { groupname, members } = req.body;

    const users = await User.find({ username: { $in: members } });
    if (users.length !== members.length)
      return res.status(400).json({ message: 'Some users not found' });

    const group = await Group.create({
      groupname,
      members: users.map(u => u._id),
      expenses: []
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* ---------------- ADD EXPENSE ---------------- */
export const addExpense = async (req, res) => {
  try {
    const { groupId, paidBy, amount, splitType, splitDetails } = req.body;

    const group = await Group.findById(groupId).populate('members');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const payer = await User.findOne({ username: paidBy });
    if (!payer) return res.status(400).json({ message: 'Payer not found' });

    let splits = [];

    if (splitType === 'EQUAL') {
      const share = parseFloat((amount / group.members.length).toFixed(2));
      const remainder = amount - share * group.members.length;

      splits = group.members.map((m, i) => ({
        user: m._id,
        amount: i === 0 ? share + remainder : share
      }));
    } else if (splitType === 'EXACT') {
      const sum = splitDetails.reduce((acc, s) => acc + s.amount, 0);
      if (sum !== amount) return res.status(400).json({ message: "Amounts don't match total" });

      splits = await Promise.all(splitDetails.map(async s => {
        const user = await User.findOne({ username: s.username });
        if (!user) throw new Error(`User ${s.username} not found`);
        return { user: user._id, amount: s.amount };
      }));
    } else if (splitType === 'PERCENT') {
      const totalPercent = splitDetails.reduce((acc, s) => acc + s.percent, 0);
      if (totalPercent !== 100) return res.status(400).json({ message: "Percentages must sum to 100" });

      splits = await Promise.all(splitDetails.map(async s => {
        const user = await User.findOne({ username: s.username });
        if (!user) throw new Error(`User ${s.username} not found`);
        return { user: user._id, amount: parseFloat(((s.percent / 100) * amount).toFixed(2)) };
      }));
    } else {
      return res.status(400).json({ message: "Invalid split type" });
    }

    const expense = await Expense.create({
      group: group._id,
      paidBy: payer._id,
      amount,
      splitType,
      splits
    });

    group.expenses.push(expense._id);
    await group.save();

    res.status(201).json(expense);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- GET GROUP BALANCES ---------------- */
export const getGroupBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'username')
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'username' },
          { path: 'splits.user', select: 'username' }
        ]
      });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const balances = calculateBalances(group);

    res.json({ group: group.groupname, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- SETTLE GROUP ---------------- */
export const settleGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'username')
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'username' },
          { path: 'splits.user', select: 'username' }
        ]
      });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    const balances = calculateBalances(group);
    const settlements = settleBalances(balances);

    res.json({ group: group.groupname, settlements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- HELPER FUNCTIONS ---------------- */
const calculateBalances = (group) => {
  const balances = {};

  // initialize balances
  group.members.forEach(m => {
    balances[m._id.toString()] = { username: m.username, balance: 0 };
  });

  // calculate net balances
  group.expenses.forEach(exp => {
    const payerId = exp.paidBy?._id?.toString();
    if (!payerId || !balances[payerId]) return;
    balances[payerId].balance += exp.amount;

    exp.splits.forEach(s => {
      const userId = s.user?._id?.toString();
      if (!userId || !balances[userId]) return;
      balances[userId].balance -= s.amount;
    });
  });

  return Object.values(balances).map(b => ({
    ...b,
    balance: parseFloat(b.balance.toFixed(2))
  }));
};

const settleBalances = (balances) => {
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b }));
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b }));

  const settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amt = Math.min(-debtor.balance, creditor.balance);
    settlements.push({
      from: debtor.username,
      to: creditor.username,
      amount: parseFloat(amt.toFixed(2))
    });

    debtor.balance += amt;
    creditor.balance -= amt;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return settlements;
};
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'username') // populate member usernames
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'username' },
          { path: 'splits.user', select: 'username' }
        ]
      });

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- GET GROUPS BY USER ---------------- */
export const getGroupsByUser = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.userId })
      .populate('members', 'username')
      .populate({
        path: 'expenses',
        populate: [
          { path: 'paidBy', select: 'username' },
          { path: 'splits.user', select: 'username' }
        ]
      });

    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
