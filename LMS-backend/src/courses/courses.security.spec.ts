import { CoursesController } from './courses.controller';
import { AdminController } from '../admin/admin.controller';
import { CourseStatus } from '../entities/course.entity';
import { UserRole } from '../entities/user.entity';

describe('Controller mutation boundaries', () => {
  const user = { sub: 5, role: UserRole.ADMIN, collegeId: 1 };
  const course = { id: 52, collegeId: 2, instructorId: 7, status: CourseStatus.PENDING_APPROVAL, assignedColleges: [] };
  it.each(['approveCourse', 'rejectCourse'])('denies cross-college %s before saving', async method => {
    const controller = Object.create(AdminController.prototype);
    controller.courseRepo = { findOne: jest.fn().mockResolvedValue(course), save: jest.fn() };
    await expect(controller[method](52, { reason: 'A test reason' }, { user })).rejects.toThrow('owned by your college');
    expect(controller.courseRepo.save).not.toHaveBeenCalled();
  });
  it('does not let an administrator distribute even their own course to another college', async () => {
    const controller = Object.create(CoursesController.prototype);
    controller.courseRepo = { findOne: jest.fn().mockResolvedValue({ ...course, collegeId: 1 }), save: jest.fn() };
    await expect(controller.assignCourse(52, { collegeIds: [2] }, { user })).rejects.toThrow('across colleges');
    expect(controller.courseRepo.save).not.toHaveBeenCalled();
  });
  it('validates PDF distribution before creating a course or uploading a file', async () => {
    const controller = Object.create(CoursesController.prototype);
    controller.userRepo = { findOne: jest.fn() };
    await expect(controller.createPdfCourse({ collegeIds: [2] }, { user })).rejects.toThrow('assigned college');
    expect(controller.userRepo.findOne).not.toHaveBeenCalled();
  });
});

describe('PDF proxy restrictions', () => {
  const controller = Object.create(CoursesController.prototype);
  afterEach(() => jest.restoreAllMocks());
  it.each(['http://127.0.0.1/private', 'https://res.cloudinary.com.attacker.example/file.pdf', 'https://user:secret@res.cloudinary.com/file.pdf', 'https://res.cloudinary.com:8080/file.pdf', 'file:///private'])('rejects unsafe URL %s before network access', async url => {
    const fetcher = jest.spyOn(global, 'fetch');
    await expect(controller.proxyPdf(url, {})).rejects.toThrow('not allowed');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects non-PDF data from the allowed host', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>unexpected</html>'));
    await expect(controller.proxyPdf('https://res.cloudinary.com/sample/file.pdf', {})).rejects.toThrow('Unable to load');
  });
});
