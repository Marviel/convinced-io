import { World } from '../World';

type SystemFunction = (world: World, ...args: any[]) => void;

export function createOptimisticSystem(system: SystemFunction): SystemFunction {
    return (world: World, ...args: any[]) => {
        // Here we could add pre/post processing for optimistic updates
        // For now, we'll just run the system directly
        return system(world, ...args);
    };
} 