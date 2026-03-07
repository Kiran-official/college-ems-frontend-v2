
const fs = require('fs');

const mappings = [
    ["C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d1c2f7f4-de2b-4659-bd32-851dadbbfa6d\\icon_users_v2_white_bg_1772887585716.png", "c:\\Users\\Admin\\OneDrive\\Desktop\\EMS\\EMS-2\\college-ems-frontend-v2\\public\\assets\\icon_users.png"],
    ["C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d1c2f7f4-de2b-4659-bd32-851dadbbfa6d\\icon_events_v2_white_bg_1772887603688.png", "c:\\Users\\Admin\\OneDrive\\Desktop\\EMS\\EMS-2\\college-ems-frontend-v2\\public\\assets\\icon_events.png"],
    ["C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d1c2f7f4-de2b-4659-bd32-851dadbbfa6d\\icon_active_events_v4_white_bg_1772887619661.png", "c:\\Users\\Admin\\OneDrive\\Desktop\\EMS\\EMS-2\\college-ems-frontend-v2\\public\\assets\\icon_active_events.png"],
    ["C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d1c2f7f4-de2b-4659-bd32-851dadbbfa6d\\icon_award_v2_white_bg_1772887636039.png", "c:\\Users\\Admin\\OneDrive\\Desktop\\EMS\\EMS-2\\college-ems-frontend-v2\\public\\assets\\icon_award.png"]
];

mappings.forEach(([src, dest]) => {
    try {
        fs.copyFileSync(src, dest);
        console.log(`Successfully copied ${src} to ${dest}`);
    } catch (err) {
        console.error(`Error copying ${src}:`, err);
    }
});
