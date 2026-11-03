import { describe, it, expect } from 'vitest';
import { mapSession, parseAddress, AGE_MAP } from '../src/adapters/galaxyAdapter.js';

const session = {
  id: '0000001005-307029',
  showDate: '2026-10-05',
  showTime: '19:00',
  screenName: 'RAP 5-DAISY',
  totalSeat: 0,
  bookedSeat: 0,
  caption: 'sub',
  version: '2d',
  movieFormat: '2D Phụ Đề',
  movie: { id: 'm1' },
  cinema: { code: '0000001005' },
};

describe('mapSession', () => {
  it('đổi giờ Việt Nam sang UTC và tính endTime', () => {
    const m = mapSession(session, { durationMin: 135 });
    expect(m.startTime.toISOString()).toBe('2026-10-05T12:00:00.000Z');
    expect(m.endTime.toISOString()).toBe('2026-10-05T14:30:00.000Z'); // 135 phút + 15 phút buffer
  });

  it('phân biệt phòng VIP, suất Encore và lồng tiếng', () => {
    expect(mapSession({ ...session, version: 'laurus2d' }).tier).toBe('VIP');
    expect(mapSession({ ...session, version: 'rebroadcast' }).kind).toBe('ENCORE');
    expect(mapSession({ ...session, caption: 'voice' }).captionMode).toBe('DUBBED');
  });
});

describe('parseAddress', () => {
  it('xử lý địa chỉ lộn xộn của Galaxy', () => {
    const a = parseAddress('Tầng 4, TTTM Vincom Plaza Đan Phượng, Đan Phượng - Hà Nội.');
    expect(a.provinceNormalized).toBe('ha noi');
    expect(a.ward).toBeNull();
    expect(parseAddress('..., Thành phố Vinh, Tỉnh Nghệ An\u200b').provinceNormalized).toBe(
      'nghe an',
    );
    expect(parseAddress('..., Phường Thông Tây Hội, TP.HCM').provinceNormalized).toBe(
      'ho chi minh',
    );
  });

  it('map độ tuổi', () => {
    expect(AGE_MAP.k).toBe('K');
    expect(AGE_MAP['18']).toBe('T18');
  });
});
