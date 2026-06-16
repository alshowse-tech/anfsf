import { ProjectControlService } from '../modules/project-control/project-control.service';
import { ProjectStatus } from '../modules/project-control/project.entity';

jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    }),
  },
}));

describe('ProjectControlService', () => {
  let service: ProjectControlService;

  beforeEach(() => {
    service = new ProjectControlService();
  });

  it('should create a project', async () => {
    const projectData = {
      projectName: 'Test Project',
      projectCode: 'TEST-001',
      totalBudget: 1000000,
      responsiblePerson: 'John Doe',
    };

    const project = await service.createProject(projectData);
    expect(project).toBeDefined();
    expect(project.projectName).toBe('Test Project');
  });

  it('should find all projects', async () => {
    const projects = await service.findAll();
    expect(Array.isArray(projects)).toBe(true);
  });
});