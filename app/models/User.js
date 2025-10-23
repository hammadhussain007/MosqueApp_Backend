const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const User = sequelize.define('users', {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true
		},
		fullName: {
			type: DataTypes.STRING,
			allowNull: false
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false
		},
		phone: {
			type: DataTypes.STRING,
			allowNull: true
		},
		address: {
			type: DataTypes.TEXT,
			allowNull: true
		},
		avatar: {
			type: DataTypes.STRING,
			allowNull: true
		},
		resetToken: {
			type: DataTypes.STRING,
			allowNull: true
		},
		resetTokenExpiry: {
			type: DataTypes.DATE,
			allowNull: true
		}
	},
	{
		indexes: [
			// Create a unique index on email
			{
				unique: true,
				fields: ['email']
			}],
	});

module.exports = User;