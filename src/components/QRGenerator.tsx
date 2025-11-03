import QRCode from "react-qr-code"; 

export default function QRGenerator({ value }: { value: string 

}) 

{ return (
<div className="flex justify-center p-4 bg-white rounded-md shadow-md">
    <QRCode value={value} size={180} />
    </div>
    );
 }