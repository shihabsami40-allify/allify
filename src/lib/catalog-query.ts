import {queryOptions} from '@tanstack/react-query';
import {getCatalog} from './marketplace.functions';
export const catalogOptions=queryOptions({queryKey:['catalog'],queryFn:()=>getCatalog(),staleTime:30000});