import Group from '../models/group.js';
import User from '../models/user.js';

/* ---------------- CREATE GROUP ---------------- */
export const createGroup = async (req, res) => {
  try {
    const { groupname, members } = req.body;

    const users = await User.find({ username: { $in: members } });
    if (users.length !== members.length)
      return res.status(400).json({ message: 'Some users not found' });

    const group = await Group.create({
      groupname,
      members: users.map(u => u._id)
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* ---------------- GET GROUPS ---------------- */
export const getGroups = async (req, res) => {
  const groups = await Group.find().populate('members', 'username');
  res.json(groups);
};

export const getGroupsByUser = async (req, res) => {
  const groups = await Group.find({ members: req.params.userId })
    .populate('members', 'username');
  res.json(groups);
};

/* ---------------- ADD EXPENSE ---------------- */
export const addExpense = async (req, res) => {
  try {
    const { groupId, paidBy, amount, splitType, splitDetails } = req.body;

    const group = await Group.findById(groupId).populate('members');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const payer = await User.findOne({ username: paidBy });
    if (!payer) return res.status(400).json({ message: 'Payer not found' });

    // calculate splits
    let splits = [];
    if (splitType === 'EQUAL') {
      const share = amount / group.members.length;
      splits = group.members.map(m => ({
        user: m._id,
        amount: m._id.equals(payer._id) ? 0 : share
      }));
    } else if (splitType === 'EXACT') {
      splits = await Promise.all(
        splitDetails.map(async s => {
          const u = await User.findOne({ username: s.username });
          return { user: u._id, amount: s.amount };
        })
      );
    } else if (splitType === 'PERCENT') {
      splits = await Promise.all(
        splitDetails.map(async s => {
          const u = await User.findOne({ username: s.username });
          return { user: u._id, amount: (s.percent / 100) * amount };
        })
      );
    }

    // create expense
    const expense = { paidBy: payer._id, amount, splitType, splits };
    group.expenses.push(expense);
    await group.save();

    // update bank balances
    for (let s of splits) {
      if (!s.user.equals(payer._id)) {
        await User.findByIdAndUpdate(s.user, { $inc: { bankbalance: -s.amount } });
      }
    }
    // payer gets total amount
    await User.findByIdAndUpdate(payer._id, { $inc: { bankbalance: amount } });

    res.status(201).json({ message: 'Expense added and balances updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/* ---------------- BALANCES ---------------- */
const calculateBalances = (group) => {
  const balances = {};

  // initialize balances
  group.members.forEach(member => {
    balances[member._id.toString()] = { user: member, balance: 0 };
  });

  // process expenses
  group.expenses.forEach(exp => {
    const payerId = exp.paidBy?._id?.toString() || exp.paidBy?.toString();
    if (!payerId || !balances[payerId]) return;

    // credit payer
    balances[payerId].balance += exp.amount;

    // debit each split
    exp.splits.forEach(split => {
      const userId = split.user?._id?.toString() || split.user?.toString();
      if (!userId || !balances[userId]) return;

      balances[userId].balance -= split.amount;
    });
  });

  return Object.values(balances);
};

export const getGroupBalances = async (req, res) => {
  const group = await Group.findById(req.params.groupId)
    .populate('members', 'username')
    .populate('expenses.paidBy', 'username')
    .populate('expenses.splits.user', 'username');

  if (!group) return res.status(404).json({ message: 'Group not found' });

  res.json({
    group: group.groupname,
    balances: calculateBalances(group)
  });
};

/* ---------------- SETTLEMENT ---------------- */
const settleBalances = (balances) => {
  const debtors = balances.filter(b => b.balance < 0);
  const creditors = balances.filter(b => b.balance > 0);
  const result = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(-debtors[i].balance, creditors[j].balance);

    result.push({
      from: debtors[i].user.username,
      to: creditors[j].user.username,
      amount: amt
    });

    debtors[i].balance += amt;
    creditors[j].balance -= amt;

    if (debtors[i].balance === 0) i++;
    if (creditors[j].balance === 0) j++;
  }
  return result;
};

export const settleGroup = async (req, res) => {
  const group = await Group.findById(req.params.groupId)
    .populate('members', 'username')
    .populate('expenses.paidBy', 'username')
    .populate('expenses.splits.user', 'username');

  const balances = calculateBalances(group);
  res.json({ settlements: settleBalances(balances) });
};
