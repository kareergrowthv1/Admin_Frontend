import React from 'react';
import MyTeam from '../team/MyTeam';

/**
 * Roles page now shares the same logic as MyTeam, but we can potentially 
 * pass a prop to default it to the Roles tab if needed.
 * For now, MyTeam is the unified Management console.
 */
const Roles = () => {
    return <MyTeam defaultTab="roles" hideTabs={true} />;
};

export default Roles;
