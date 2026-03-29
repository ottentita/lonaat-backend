UPDATE users 
SET password = '$2a$10$TuukPotcw2cRTSXXBloAEOo5jI0WHQ/xYnpyySRVmMmpEPLfOZAHG' 
WHERE email = 'lonaat64@gmail.com';

SELECT email, LENGTH(password) as pwd_length, LEFT(password, 15) as pwd_start 
FROM users 
WHERE email = 'lonaat64@gmail.com';
