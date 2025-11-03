export interface Laptop {
id: string;
mashincode: number;
model: string;
serial_no: string;
os: string;
gen?: string;
cpu?: string;
ram?: string;
ssd?: string;
hdd?: string;
condition?: string;
location?: string;
status?: string;
purchase_date?: string;
remarks?: string;
qr_code?: string;
created_at?: string;
}


export interface Transfer {
id: string;
laptop_id: string;
from_location: string;
to_location: string;
transfer_type: string;
person_name?: string;
contact_info?: string;
transfer_date?: string;
remarks?: string;
}