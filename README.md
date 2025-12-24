Expense Sharing Application (Backend)
A simplified Splitwise-like backend that allows users to create groups, add shared expenses, track balances, and settle dues.

Live API
https://expense-sharing-application-hkmh.onrender.com

Tech Stack
Node.js, Express.js
MongoDB Atlas, Mongoose
Deployed on Render

Features
Create users and groups
Add group expenses
Split types supported:
  *Equal
  *Exact
  *Percentage
Track who owes whom
Simplified settlements

Key APIs
Method	Endpoint
POST	/api/users/createuser
POST	/api/groups/creategroup
POST	/api/groups/addexpense
GET	/api/groups/:groupId/balances
GET	/api/groups/:groupId/settle

Design Approach
Balances are calculated dynamically from expenses (no redundant storage)
Ensures accuracy and easy settlement
Modular and scalable REST API design

Author
Preethi Pattlolla
Backend / MERN Stack Developer
