import {validQuantity,type CartLine,type Product} from './marketplace';
export function demoCheckoutAllowed(lines:CartLine[],products:Product[]){return lines.length>0&&lines.every(line=>{const p=products.find(p=>p.id===line.id);return !!p&&p.seller_stores?.is_demo===true&&validQuantity(line.quantity,p.stock);});}
export const demoPaymentMethod='cod' as const;
export const demoDeliveryIntegrated=false;