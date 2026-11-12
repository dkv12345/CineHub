import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { prisma } from '@cinehub/db';
import { requireAuth } from '../../platform/http/auth.middleware.js';
import { optionalAuth } from '../../platform/http/optionalAuth.js';
import { AppError } from '../../platform/utils/errors.js';
import { getMongoCollection } from '../chatbot/index.js';

export const memberRouter = Router();

const memoryReviews = new Map();

// 1. Favorites (Watchlist)
memberRouter.get('/favorites', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      data: rows.map((r) => ({
        movieId: r.movieId,
        createdAt: r.createdAt.toISOString(),
        movie: r.movie,
      })),
    });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/favorites/:movieId', requireAuth, async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ id: movieId }, { slug: movieId }] },
    });
    if (!movie) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phim.');

    await prisma.favorite.upsert({
      where: { userId_movieId: { userId: req.user.id, movieId: movie.id } },
      update: {},
      create: { userId: req.user.id, movieId: movie.id },
    });
    res.status(201).json({ data: { favorited: true, movieId: movie.id } });
  } catch (err) {
    next(err);
  }
});

memberRouter.delete('/favorites/:movieId', requireAuth, async (req, res, next) => {
  try {
    const { movieId } = req.params;
    await prisma.favorite.deleteMany({
      where: { userId: req.user.id, movieId },
    });
    res.json({ data: { favorited: false, movieId } });
  } catch (err) {
    next(err);
  }
});

// 2. Movie Subscriptions (Release Alerts)
memberRouter.get('/subscriptions', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.movieSubscription.findMany({
      where: { userId: req.user.id },
      include: { movie: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/subscriptions/:movieId', requireAuth, async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ id: movieId }, { slug: movieId }] },
    });
    if (!movie) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phim.');

    const sub = await prisma.movieSubscription.upsert({
      where: { userId_movieId: { userId: req.user.id, movieId: movie.id } },
      update: {},
      create: { userId: req.user.id, movieId: movie.id },
    });
    res.status(201).json({ data: sub });
  } catch (err) {
    next(err);
  }
});

// 3. In-App Notifications (Bell)
memberRouter.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const list = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

memberRouter.put('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ data: { read: true, id } });
  } catch (err) {
    next(err);
  }
});

// 4. Movie Reviews (MongoDB `reviews` collection + MySQL `Movie.ratingAvg` sync)
memberRouter.get('/reviews/:movieId', optionalAuth, async (req, res, next) => {
  try {
    const { movieId } = req.params;
    let reviews = [];
    const collection = await getMongoCollection('reviews');
    if (collection) {
      reviews = await collection.find({ movieId }).sort({ createdAt: -1 }).limit(50).toArray();
    } else {
      reviews = memoryReviews.get(movieId) || [];
    }
    res.json({ data: reviews });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/reviews/:movieId', requireAuth, async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const rating = Math.min(5, Math.max(1, Number(req.body.rating) || 5));
    const comment = String(req.body.comment || '').trim();
    if (!comment) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng nhập nội dung đánh giá.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, fullName: true },
    });
    const movie = await prisma.movie.findFirst({
      where: { OR: [{ id: movieId }, { slug: movieId }] },
    });
    if (!movie) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy phim.');

    const reviewDoc = {
      movieId: movie.id,
      userId: req.user.id,
      userName: user?.fullName || req.user.email,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    let allRatings = [rating];
    const collection = await getMongoCollection('reviews');
    if (collection) {
      await collection.updateOne(
        { movieId: movie.id, userId: req.user.id },
        { $set: reviewDoc },
        { upsert: true },
      );
      const docs = await collection.find({ movieId: movie.id }).toArray();
      allRatings = docs.map((d) => Number(d.rating) || 5);
    } else {
      const list = (memoryReviews.get(movie.id) || []).filter((r) => r.userId !== req.user.id);
      list.unshift(reviewDoc);
      memoryReviews.set(movie.id, list);
      allRatings = list.map((d) => d.rating);
    }

    const ratingCount = allRatings.length;
    const ratingAvg =
      ratingCount > 0
        ? Number((allRatings.reduce((a, b) => a + b, 0) / ratingCount).toFixed(2))
        : rating;

    await prisma.movie.update({
      where: { id: movie.id },
      data: { ratingAvg, ratingCount },
    });

    res.status(201).json({
      data: {
        review: reviewDoc,
        ratingAvg,
        ratingCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 5. Update Profile, Change Password, Logout All Devices
memberRouter.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { fullName, phone, avatarUrl } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName ? { fullName: String(fullName).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
      },
    });
    res.json({ data: { user: updated } });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu mới phải từ 8 ký tự trở lên.');
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.passwordHash) {
      throw new AppError(
        400,
        'BAD_REQUEST',
        'Tài khoản đăng nhập qua Google không dùng mật khẩu cục bộ.',
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'UNAUTHORIZED', 'Mật khẩu hiện tại không chính xác.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ data: { updated: true, message: 'Đổi mật khẩu thành công.' } });
  } catch (err) {
    next(err);
  }
});

memberRouter.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.clearCookie('refreshToken', { path: '/api' });
    res.json({ data: { loggedOutAll: true, message: 'Đã đăng xuất khỏi tất cả thiết bị.' } });
  } catch (err) {
    next(err);
  }
});
