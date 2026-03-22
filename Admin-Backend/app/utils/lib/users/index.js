const maleFirstNames = require('./lib/male_fname.json');
const femaleFirstNames = require('./lib/female_fname.json');
const lastNames = require('./lib/lname.json');

const generators = {};

generators.getRandomBots = () => {
    const gender = _.randomBetween(0, 1) === 0 ? 'male' : 'female';
    const users = gender === 'male' ? maleFirstNames : femaleFirstNames;
    const firstNameindex = _.randomBetween(0, users.length);
    const lastNameindex = _.randomBetween(0, lastNames.length);
    return {
        sUserName: `${users[firstNameindex]} ${lastNames[lastNameindex]}`,
        nAge: _.randomBetween(18, 45),
        sAvatar: _.randomProfile(gender),
        eUserType: 'ubot',
        eGender: gender,
        //  nChips: _.randomBetween(50, 500),
        nPracticeChips: _.randomBetween(5000, 25000),
    };
};

module.exports = generators;
