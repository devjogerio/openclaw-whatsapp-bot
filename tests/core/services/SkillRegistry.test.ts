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

    it('should throw error for invalid skill name', () => {
        const invalidSkill = { ...mockSkill, name: '' as any };
        expect(() => registry.register(invalidSkill)).toThrow(/Nome obrigatório/);
    });

    it('should throw error for missing description', () => {
        const invalidSkill = { ...mockSkill, description: '' as any };
        expect(() => registry.register(invalidSkill)).toThrow(/Descrição obrigatória/);
    });

    it('should register multiple skills', () => {
        const skill1 = { ...mockSkill, name: 'skill1' };
        const skill2 = { ...mockSkill, name: 'skill2' };
        
        registry.registerAll([skill1, skill2]);
        
        expect(registry.get('skill1')).toBeDefined();
        expect(registry.get('skill2')).toBeDefined();
        expect(registry.getAll()).toHaveLength(2);
    });

    it('should check if skill exists', () => {
        registry.register(mockSkill);
        expect(registry.has('test_skill')).toBe(true);
        expect(registry.has('non_existent')).toBe(false);
    });

    it('should unregister a skill', () => {
        registry.register(mockSkill);
        expect(registry.unregister('test_skill')).toBe(true);
        expect(registry.has('test_skill')).toBe(false);
        expect(registry.unregister('test_skill')).toBe(false); // Already removed
    });

    it('should clear all skills', () => {
        const skill1 = { ...mockSkill, name: 'skill1' };
        const skill2 = { ...mockSkill, name: 'skill2' };
        registry.registerAll([skill1, skill2]);
        
        registry.clear();
        expect(registry.getAll()).toHaveLength(0);
        expect(registry.has('skill1')).toBe(false);
    });

    it('should list all skill names', () => {
        const skill1 = { ...mockSkill, name: 'skill1' };
        const skill2 = { ...mockSkill, name: 'skill2' };
        registry.registerAll([skill1, skill2]);
        
        const names = registry.listNames();
        expect(names).toContain('skill1');
        expect(names).toContain('skill2');
        expect(names).toHaveLength(2);
    });
});
