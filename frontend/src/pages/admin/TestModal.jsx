import React, { useState } from 'react';
import { X } from 'lucide-react';
export default function TestModal(){
  const [show, setShow] = useState(true);
  const selectedUser = { name: 'Test' };
  const getRoleBadgeColor = () => 'bg-test';
  return (
    <div>
      {show && selectedUser && (
        <div className=" fixed\>modal content</div>
 )}
 </div>
 );
}
