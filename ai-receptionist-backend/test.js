import admin from 'firebase-admin';
console.log('admin keys:', Object.keys(admin));
console.log('admin.default keys:', admin.default ? Object.keys(admin.default) : 'undefined');
console.log('apps:', admin.apps);
