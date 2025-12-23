import User from '../models/user.js';
import Group from '../models/group.js';

// Create single user
export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Create multiple users
export const createUsers = async (req, res) => {
  try {
    const users = await User.insertMany(req.body);
    res.status(201).json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

// Get user by ID
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

// Overall balances (raw)
export const getBalances = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('members', 'username')
      .populate('expenses.paidBy', 'username')
      .populate('expenses.splits.user', 'username');

    const balances = {};

    groups.forEach(group => {
      group.expenses.forEach(exp => {
        exp.splits.forEach(s => {
          if (s.user.username !== exp.paidBy.username) {
            balances[s.user.username] ??= {};
            balances[s.user.username][exp.paidBy.username] ??= 0;
            balances[s.user.username][exp.paidBy.username] += s.amount;
          }
        });
      });
    });

    res.json({ balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
