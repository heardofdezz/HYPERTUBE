// Mongoose handler 
const mongoose = require('mongoose')
// Password hashing 
const bcrypt = require('bcrypt')
const saltRounds = 10


const userSchema = mongoose.Schema({ 
    _id: mongoose.Types.ObjectId,
    email: { type: String, index: true, unique: true },
    username: String,
    firstname: String,
    lastname: String,
    password: String,
    admin: Boolean,
    premium: Boolean,
    verify_token: String,
    verify: Boolean,
    created: { type: Date, default: Date.now },
});
userSchema.set('validateBeforeSave', false);

// Hashing password before saving into database
userSchema.pre('save', function(next){
    this.password = bcrypt.hashSync(this.password, saltRounds);
    next();
});



module.exports = mongoose.model('User', userSchema);