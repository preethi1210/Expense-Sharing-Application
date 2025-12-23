import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  phonenumber: { type: String, required: true, unique: true },
  bankbalance: { type: Number, required: true, default: 0 }
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
