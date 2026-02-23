const fs = require('fs');
const filePath = 'd:/projects/TRANS-IT/apps/student/data/busRoutes.js';
let content = fs.readFileSync(filePath, 'utf8');

const updates = {
    "101": 'driver: "KARMEGAM",',
    "103": 'driver: "SELVAM – 8807923848",',
    "104": 'driver: "JEYAKUMAR-9787899259",',
    "105": 'driver: "CHELLA MANI",',
    "106": 'driver: "PREMKUMAR – 9626229032",',
    "107": 'driver: "MADHU SUTHANAN",',
    "108": 'driver: "S.ARUNKUMAR-9791757233",',
    "109": 'driver: "NAGARAJAN",',
    "110": 'driver: "SURESHKUMAR",',
    "111": 'driver: "KUMAR",',
    "112": 'driver: "MANIKANDAN",',
    "113": 'driver: "KARUPPASAMY",',
    "114": 'driver: "MURUGAN",',
    "115": 'driver: "RAMA KRISHNAN",',
    "116": 'driver: "VENKATESHGOPI",',
    "117": 'driver: "MUNEESWARAN",',
    "118": 'driver: "ANANTHAN",',
    "119": 'driver: "SAKTHIVEL",',
    "120": 'driver: "PERIYAKARUPPAN",',
    "121": 'driver: "MUTHUKUMAR – 9790120282",',
    "122": 'driver: "R. ARUN KUMAR- 9894303246",',
    "123": 'driver: "PRABHU-9597519724",',
    "124": 'driver: "RAJASEKARAN",'
};

Object.keys(updates).forEach(key => {
    const regex = new RegExp(`("${key}":\\s*\\{\\s*)driver:\\s*"[^"]*",`, 'g');
    content = content.replace(regex, `$1${updates[key]}`);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
