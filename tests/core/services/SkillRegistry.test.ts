import { SkillRegistry } from '../../../src/core/services/SkillRegistry';
import { ISkill } from '../../../src/core/interfaces/ISkill';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
    }
}));

describe('SkillRegistry', () => {
    let registry: SkillRegistry;
    let mockSkill: ISkill;

    beforeEach(() => {
        registry = new SkillRegistry();
        mockSkill = {
            name: 'test_skill',
            description: 'A test skill',
            parameters: { type: 'object', properties: {} },
            execute: jest.fn().mockResolvedValue('success')
        };
    });

    it('should register and retrieve a skill', () => {
        registry.register(mockSkill);
        const retrieved = registry.get('test_skill');
        expect(retrieved).toBe(mockSkill);
    });

    it('should return undefined for non-existent skill', () => {
        expect(registry.get('non_existent')).toBeUndefined();
    });

    it('should generate correct tools definition', () => {
        registry.register(mockSkill);
        const tools = registry.getToolsDefinition();
        
        expect(tools).toHaveLength(1);
        expect(tools[0]).toEqual({
            type: 'function',
            function: {
                name: mockSkill.name,
                description: mockSkill.description,
                parameters: mockSkill.parameters
            }
        });
    });

    it('should overwrite existing skill with same name', () => {
        registry.register(mockSkill);
        
        const newSkill = { ...mockSkill, description: 'Updated description' };
        registry.register(newSkill);
        
        const retrieved = registry.get('test_skill');
        expect(retrieved?.description).toBe('Updated description');
    });
});
