export interface CinemaCornerHighlightCard {
  readonly title: string;
  readonly text: string;
  readonly stillIndex: number;
}

export interface CinemaCornerArticle {
  readonly slug: string;
  readonly movieId: string;
  readonly layout?: 'editorial' | 'kids-magazine';
  readonly title: string;
  readonly headline: string;
  readonly subtitle: string;
  readonly year: string;
  readonly ageRating: string;
  readonly duration: string;
  readonly genre: string;
  readonly rating: number;
  readonly release: string;
  readonly director: string;
  readonly cast: string;
  readonly posterUrl: string;
  readonly backdropUrl: string;
  readonly synopsis: string;
  readonly quoteBox?: string;
  readonly highlightCards?: readonly CinemaCornerHighlightCard[];
  readonly stills: readonly {
    readonly url: string;
    readonly position: string;
    readonly alt: string;
  }[];
  readonly paragraphs: readonly string[];
}

export const CINEMA_CORNER_ARTICLES: readonly CinemaCornerArticle[] = [
  {
    slug: 'trai-giam-hanh-phuc',
    movieId: 'trai-giam-hanh-phuc',
    title: 'TRẠI GIAM HẠNH PHÚC',
    headline: 'Trại Giam Hạnh Phúc — Sau bản án, một người còn có thể trở thành ai?',
    subtitle: 'Sau bản án, một người còn có thể trở thành ai?',
    year: '2026',
    ageRating: 'T16',
    duration: '1h 45m',
    genre: 'Hài, Gia đình, Tình cảm',
    rating: 9.2,
    release: '20/11/2026',
    director: 'Trung Lùn',
    cast: 'Tuấn Trần, Ma Ran Đô, Lương Thế Thành',
    posterUrl:
      'https://cdn.galaxycine.vn/media/2026/7/15/trai-giam-hanh-phuc-500_1784105011313.jpg',
    backdropUrl:
      'https://cdn.galaxycine.vn/media/2026/7/15/trai-giam-hanh-phuc-750_1784105012332.jpg',
    synopsis:
      'Phúc, từ một giáo viên hiền lành vì muốn bảo vệ em gái mà phải vào tù. Giữa cuộc sống sau song sắt khắc nghiệt, bản tính lương thiện và "giáo án đặc biệt" của anh dần làm thay đổi những con người xung quanh.',
    stills: [
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-1.webp',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-2.webp',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-3.jpg',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-4.jpg',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-5.jpg',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/trai-giam-hanh-phuc/still-6.jpg',
        position: 'object-center',
        alt: 'Trại Giam Hạnh Phúc - Cảnh 6',
      },
    ],
    paragraphs: [
      'Phúc từng là thầy giáo. Anh vào tù sau khi gây ra án mạng trong lúc bảo vệ em gái. Hai chi tiết ấy khiến người ta dễ vội vàng chọn một cách để nhìn anh. Người thương Phúc sẽ nhắc đến lý do anh ra tay. Người nhìn vào hậu quả sẽ hỏi lý do ấy thay đổi được gì. Câu chuyện đáng theo dõi vì cả hai câu hỏi đều có chỗ đứng.',
      'Cái tên Trại Giam Hạnh Phúc nghe như một câu đùa, cho đến khi nghĩ về chữ “hạnh phúc” ở một nơi mà ngay cả việc đi đâu, gặp ai cũng phải theo quy định. Trong hoàn cảnh ấy, được người khác nhớ mình thích gì, để ý hôm nay mình ít nói hơn mọi ngày, hay đơn giản là gọi mình bằng cái tên quen thuộc cũng có thể trở thành chuyện đáng kể. Người từng đứng lớp như Phúc có lẽ hiểu cảm giác ấy theo một cách riêng. Nghề cũ của anh vốn đòi hỏi phải nhìn xem một người còn có thể tiến bộ ở đâu, kể cả sau khi họ mắc lỗi.',
      'Điều đáng chờ là phim sẽ dành bao nhiêu chỗ cho cuộc sống sau hành động đã đưa Phúc vào tù. Một bản án có thể xác định anh phải chịu trách nhiệm về việc gì. Còn việc anh sẽ đối xử với người bên cạnh thế nào, trong những ngày chẳng có ai đứng đó để khen anh tử tế, mới cho thấy anh đang trở thành người ra sao.',
    ],
  },
  {
    slug: 'the-last-whale-singer',
    movieId: 'the-last-whale-singer',
    layout: 'kids-magazine',
    title: 'TIẾNG HÁT CÁ VOI',
    headline: 'Tiếng Hát Cá Voi — Tìm lại giọng mình sau khi người từng lắng nghe đã mất',
    subtitle: 'Tìm lại giọng mình sau khi người từng lắng nghe đã mất',
    year: '2026',
    ageRating: 'P',
    duration: '1h 19m',
    genre: 'Hoạt hình',
    rating: 9.2,
    release: '15/11/2026',
    director: 'Pavel Hrubos, Steven Majaury, Reza Memari',
    cast: 'Vincent Tong, Lisa Ortiz',
    posterUrl:
      'https://cdn.galaxycine.vn/media/2026/10/30/the-last-whale-singer-1200x1800-1_1793353612712.jpg',
    backdropUrl:
      'https://cdn.galaxycine.vn/media/2026/10/30/the-last-whale-singer-1800x1200_1793353619742.jpg',
    synopsis:
      'Khi một sinh vật cổ xưa thoát ra từ tảng băng tan chảy, chú cá voi lưng gù trẻ tuổi Vincent phải vượt qua nỗi mất mát để tìm kiếm khúc ca huyền bí cứu lấy đại dương.',
    quoteBox:
      'Không chỉ là chuyến phiêu lưu rực rỡ dưới đáy đại dương xanh thẳm, Tiếng Hát Cá Voi còn gửi gắm thông điệp dịu dàng về lòng dũng cảm và cách một trái tim nhỏ tìm thấy giai điệu của riêng mình.',
    highlightCards: [
      {
        title: 'Đại Dương Rực Rỡ!',
        text: 'Thế giới san hô phát sáng và những rãnh biển sâu được dựng bằng màu sắc trong trẻo, cuốn hút mọi ánh nhìn của khán giả nhỏ tuổi.',
        stillIndex: 1,
      },
      {
        title: 'Tình Bạn Vượt Sóng',
        text: 'Chú cá hay lo và cô cá voi sát thủ cá tính đồng hành cùng Vincent, chứng minh rằng đi cùng bạn bè luôn bớt cô đơn.',
        stillIndex: 2,
      },
      {
        title: 'Khúc Ca Của Riêng Mình',
        text: 'Bộ phim nhắc các em nhỏ rằng không cần phải hát giống hệt ai khác — giọng hát thật lòng của chính mình mới là phép màu.',
        stillIndex: 4,
      },
    ],
    stills: [
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-1.jpg',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-2.png',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-3.jpg',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-4.jpg',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-5.jpg',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/the-last-whale-singer/still-6.jpg',
        position: 'object-center',
        alt: 'Tiếng Hát Cá Voi - Cảnh 6',
      },
    ],
    paragraphs: [
      'Vincent là con của một cá voi có giọng hát bảo vệ đại dương. Sau tai nạn cướp đi cha mẹ, cậu mất niềm tin vào bản thân. Khi băng tan giải thoát một sinh vật cổ xưa, Vincent phải lên đường tìm bài ca của chính mình. Với một nhân vật như Vincent, cất tiếng có thể là việc khó nhất trong cả chuyến đi. Mỗi lần thử hát, cậu cũng phải nghe lại khoảng trống mà cha mẹ để lại.',
      'Ý tưởng hay nhất của phim nằm ở sự khác nhau giữa thừa hưởng một giọng hát và tìm được điều mình muốn hát. Khi cha còn sống, Vincent có thể nghe giọng cha mà biết mình đang ở nhà. Khi cha mất, cùng một giai điệu ấy dễ trở thành thứ để cậu đem mình ra so sánh. Hát giống cha có thể giúp Vincent thấy ông gần hơn trong chốc lát, nhưng cũng khiến cậu khó nghe ra phần nào trong tiếng hát thuộc về mình.',
      'Đi cùng Vincent là một chú cá hay lo và một cô cá voi sát thủ đầy cá tính. Hai người bạn khiến hành trình bớt cô độc theo một cách rất cụ thể: Vincent có thể cất tiếng trước những người chưa từng nghe cha cậu hát. Với họ, giọng cậu được nghe lần đầu. Sau mất mát, đôi khi một tình bạn mới quý ở đúng điều đó. Người bạn ấy biết mình từ hôm nay, nên có thể nhận ra những gì mình đang làm được ngay lúc mình chỉ còn nhớ những gì đã mất.',
    ],
  },
  {
    slug: 'ich-verstehe-ihren-unmut',
    movieId: 'ich-verstehe-ihren-unmut',
    title: 'TÔI HIỂU SỰ BỨC XÚC CỦA CÁC VỊ',
    headline: 'Tôi Hiểu Sự Bức Xúc Của Các Vị — Ai là người phải nói lời cho thôi việc?',
    subtitle: 'Ai là người phải nói lời cho thôi việc?',
    year: '2026',
    ageRating: 'T13',
    duration: '1h 57m',
    genre: 'Tâm lý',
    rating: 8.5,
    release: '14/11/2026',
    director: 'Kilian Armando Friedrich',
    cast: 'Sadibou Diabang, Nada Kosturin',
    posterUrl:
      'https://cdn.galaxycine.vn/media/2026/10/30/ich-verstehe-ihren-unmut-1200x1800_1793332609485.jpg',
    backdropUrl:
      'https://cdn.galaxycine.vn/media/2026/10/30/ich-verstehe-ihren-unmut-1800x1200-1_1793332618933.jpg',
    synopsis:
      'Câu chuyện tâm lý sắc lạnh về Heike, người quản lý cấp giữa đứng giữa áp lực cắt giảm nhân sự từ ban lãnh đạo và cuộc sống bấp bênh của những đồng nghiệp gắn bó mỗi ngày.',
    stills: [
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-1.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-2.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-3.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-4.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-5.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/ich-verstehe-ihren-unmut/still-6.jpg',
        position: 'object-center',
        alt: 'Tôi Hiểu Sự Bức Xúc Của Các Vị - Cảnh 6',
      },
    ],
    paragraphs: [
      'Heike giám sát một đội vệ sinh. Bà nhận yêu cầu từ ban lãnh đạo và làm việc hằng ngày với những người sẽ phải sống cùng hậu quả của các yêu cầu ấy. Khi hợp đồng đứng trước nguy cơ đổ vỡ, bà phải chọn một người trong đội để cho thôi việc. Trên giấy, đó là cắt một vị trí. Với Heike, đó là tìm một người quen, mời họ ngồi xuống và nói rằng từ nay họ sẽ mất việc.',
      'Nhan đề nghe giống một câu người ta nói khi cuộc họp sắp kết thúc. “Tôi hiểu sự bức xúc của các vị” thừa nhận rằng người nghe có lý do để giận, nhưng vẫn để ngỏ chuyện ai có quyền thay đổi quyết định. Đặt câu ấy cạnh tình thế của Heike, ta thấy sự khó xử của một người quản lý cấp giữa. Bà đủ gần để biết một khoản lương quan trọng thế nào với nhân viên, nhưng quyền của bà chủ yếu nằm ở việc chọn ai sẽ mất khoản lương đó.',
      'Câu hỏi khó nhất là phải đọc hành động của Heike ra sao nếu bà làm đúng điều công ty yêu cầu. Với ban lãnh đạo, bà có thể là người đã giữ được hợp đồng. Với người bị sa thải, bà là người biết rõ họ đã làm việc thế nào mà vẫn ký quyết định. Cả hai cách nhìn đều có căn cứ. Chính vì thế, câu chuyện có thể khiến người xem nhớ đến những lần ở chỗ làm, một quyết định được gọi là “cần thiết” từ rất lâu trước khi người chịu hậu quả được mời vào phòng.',
    ],
  },
  {
    slug: 'ngay-con-con-me',
    movieId: 'ngay-con-con-me',
    title: 'NGÀY CON CÒN MẸ',
    headline: 'Ngày Con Còn Mẹ — Điều Mây cần là được mẹ hỏi mình muốn gì',
    subtitle: 'Điều Mây cần là được mẹ hỏi mình muốn gì',
    year: '2026',
    ageRating: 'T13',
    duration: '1h 45m',
    genre: 'Tâm lý, Gia đình',
    rating: 9.6,
    release: '11/11/2026',
    director: 'Vũ Ngọc Đãng',
    cast: 'Hồng Đào, Phương Anh Đào, Ma Ran Đô, Nguyên Thảo, Huy Anh',
    posterUrl: 'https://cdn.galaxycine.vn/media/2026/9/11/ngay-con-con-me--500_1789117934908.jpg',
    backdropUrl: 'https://cdn.galaxycine.vn/media/2026/9/11/ngay-con-con-me-750_1789117935925.jpg',
    synopsis:
      'Hành trình giằng xé nhưng ấm áp về tình mẫu tử, nơi những hiểu lầm tích tụ suốt nhiều năm giữa bà Tím và cô con gái Mây chỉ thực sự được tháo gỡ khi biến cố bất ngờ ập xuống.',
    stills: [
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-1.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-2.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-3.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-4.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-5.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/ngay-con-con-me/still-6.jpg',
        position: 'object-center',
        alt: 'Ngày Con Còn Mẹ - Cảnh 6',
      },
    ],
    paragraphs: [
      'Trong teaser, bà Tím sẵn sàng giúp Pháo mở công ty. Với Mây, bà hình dung con gái có thể sang làm dưới quyền anh trai. Có lẽ trong đầu bà, đó cũng là một cách thu xếp cho con. Nhưng với Mây, hai đề nghị đặt cạnh nhau cho thấy mẹ đã nghĩ rất khác về hai đứa. Pháo được giúp để thử làm điều mình muốn. Mây được sắp sẵn một chỗ trong kế hoạch của người khác.',
      'Chi tiết ấy giải thích vì sao một cuộc nói chuyện tưởng như chỉ xoay quanh công việc lại có thể làm Mây đau đến vậy. Cô đang nghe một quyết định của hôm nay bằng ký ức của rất nhiều lần trước. Người ngoài có thể thấy cô phản ứng mạnh vì một câu nói. Mây có thể đã mất nhiều năm mới gọi tên được điều khiến câu nói ấy khó chịu đến thế.',
      'Poster đặt cả nhà quanh một bàn ăn, với phía bà Tím và Pháo ngập ánh ấm còn phía Mây trầm và lạnh hơn. Hai mẹ con chỉ cách nhau vài chỗ ngồi. Sự gần gũi ấy khiến khoảng cách giữa họ càng dễ thấy. Điều mình muốn theo dõi là khoảnh khắc bà Tím hiểu rằng con gái đang kể lại một tuổi thơ mà bà cũng có mặt, nhưng hai người nhớ rất khác nhau. Nếu phim dành đủ thời gian cho cả hai ký ức ấy, cuộc nói chuyện giữa mẹ và con sẽ đáng nhớ hơn bất kỳ lời hòa giải nào được nói cho kịp.',
    ],
  },
  {
    slug: 'ramayana-rise-of-a-legend',
    movieId: 'ramayana-rise-of-a-legend',
    title: 'RAMAYANA: KHỞI NGUỒN MỘT HUYỀN THOẠI',
    headline:
      'Ramayana: Khởi Nguồn Một Huyền Thoại — Khi số phận đã được báo trước, lựa chọn còn nghĩa gì?',
    subtitle: 'Khi số phận đã được báo trước, lựa chọn còn nghĩa gì?',
    year: '2026',
    ageRating: 'T13',
    duration: '2h 48m',
    genre: 'Hành động, Giả Tưởng',
    rating: 9.7,
    release: '06/11/2026',
    director: 'Nitesh Tiwari',
    cast: 'Ranbir Kapoor, Yash, Sai Pallavi',
    posterUrl: 'https://cdn.galaxycine.vn/media/2026/11/2/ramayana-2_1793610068685.jpg',
    backdropUrl: 'https://cdn.galaxycine.vn/media/2026/11/2/ramayana-3_1793610074316.jpg',
    synopsis:
      'Sử thi hoành tráng xoay quanh cuộc đối đầu định mệnh giữa hoàng tử Rama — biểu tượng của sự hy sinh — và Ravana, vị vua bất tử bị thôi thúc bởi lòng báo thù.',
    stills: [
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-1.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-2.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-3.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-4.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-5.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/ramayana-rise-of-a-legend/still-6.jpg',
        position: 'object-center',
        alt: 'Ramayana - Cảnh 6',
      },
    ],
    paragraphs: [
      'Phần giới thiệu đặt Rama và Ravana ở hai phía của một lời tiên tri. Rama là vị hoàng tử gắn với sự hy sinh. Ravana là vị vua bị thôi thúc bởi báo thù. Cuộc đối đầu giữa họ có quy mô của một sử thi, nhưng điều khiến nó đáng nghĩ nằm ở một câu hỏi rất gần: nếu đã biết mình sẽ gặp ai trên đường, ta còn được quyết định mình sẽ đến cuộc gặp ấy với tư cách nào?',
      'Hy sinh nghe cao cả khi được kể lại sau chiến thắng. Trước lúc lựa chọn, nó có thể chỉ là việc chấp nhận mất một điều mình vẫn còn muốn giữ. Còn báo thù có sức hấp dẫn vì nó cho người đang đau một việc cụ thể để làm. Nếu phim dành đủ thời gian cho lý do khiến Rama chấp nhận mất mát và Ravana bám lấy món nợ cũ, cuộc đối đầu của họ sẽ có sức nặng ngay cả trước khi hai người chạm mặt.',
      'Đó cũng là thử thách của một bản chuyển thể sử thi. Khán giả có thể đến vì muốn thấy thế giới ấy hiện ra trên màn ảnh rộng. Nhưng thứ còn đáng bàn sau buổi chiếu là khoảnh khắc một nhân vật có thể làm khác đi mà vẫn chọn con đường đã khiến họ trở thành người trong truyền thuyết.',
    ],
  },
  {
    slug: 'the-cat-in-the-hat',
    movieId: 'the-cat-in-the-hat',
    layout: 'kids-magazine',
    title: 'CHÀNG MÈO MANG MŨ',
    headline: 'Chàng Mèo Mang Mũ — Ngày đầu ở một nơi xa lạ đâu cần phải suôn sẻ',
    subtitle: 'Ngày đầu ở một nơi xa lạ đâu cần phải suôn sẻ',
    year: '2026',
    ageRating: 'P',
    duration: '1h 45m',
    genre: 'Hoạt hình, Phiêu lưu',
    rating: 7.5,
    release: '06/11/2026',
    director: 'Alessandro Carloni, Erica Rivinoja',
    cast: 'Matt Berry, Bill Hader, Quinta Brunson',
    posterUrl: 'https://cdn.galaxycine.vn/media/2026/6/24/cat-in-the-hat-500_1782273714785.jpg',
    backdropUrl:
      'https://cdn.galaxycine.vn/media/2025/7/2/the-cat-in-the-hat-750_1751430437489.jpg',
    synopsis:
      'Chú mèo đội mũ nổi tiếng rắc rối được giao nhiệm vụ giúp hai anh em Gabby và Sebastian hòa nhập ở thị trấn mới — cơ hội cuối cùng trước khi chú mất chiếc mũ phép thuật.',
    quoteBox:
      'Với bảng màu kẹo ngọt tươi tắn và những trò nghịch ngợm tung nóc nhà, Chàng Mèo Mang Mũ biến nỗi hồi hộp ngày đầu chuyển trường thành một bữa tiệc trí tưởng tượng cười nghiêng ngả.',
    highlightCards: [
      {
        title: 'Chiếc Mũ Phép Thuật!',
        text: 'Mỗi lần chiếc mũ sọc đỏ trắng nhấc lên là cả căn phòng hóa thành công viên giải trí kỳ ảo đầy bất ngờ.',
        stillIndex: 1,
      },
      {
        title: 'Quậy Mà Đáng Yêu',
        text: 'Sự hài hước lém lỉnh của Bill Hader giúp nhân vật Chàng Mèo vừa tinh quái vừa ấm áp, gần gũi với cả nhà.',
        stillIndex: 3,
      },
      {
        title: 'Bạn Mới Ở Nơi Mới',
        text: 'Hai anh em Gabby và Sebastian học cách mở lòng đón nhận thay đổi — đôi khi chỉ cần một nụ cười làm quen là đủ.',
        stillIndex: 5,
      },
    ],
    stills: [
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-1.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-2.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-3.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-4.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-5.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/the-cat-in-the-hat/still-6.jpg',
        position: 'object-center',
        alt: 'Chàng Mèo Mang Mũ - Cảnh 6',
      },
    ],
    paragraphs: [
      'Gabby và Sebastian vừa chuyển đến một thị trấn mới. Người được giao nhiệm vụ giúp hai anh em hòa nhập lại là một chú mèo nổi tiếng chuyên gây rắc rối, đang đứng trước nguy cơ mất chiếc mũ phép thuật. Cách đặt hai vấn đề cạnh nhau khá duyên. Bọn trẻ sợ mình chưa biết cư xử thế nào ở chỗ mới, còn người đến giúp chúng thì đã có cả một danh tiếng vì cư xử chẳng giống ai.',
      'Chuyển nhà với trẻ con có thể là mất cả một loạt điều người lớn ít để ý. Đứa bạn biết mình hay ngồi đâu giờ ở trường khác. Ở lớp mới, ngay cả chuyện tìm một chỗ ngồi vào giờ ăn cũng phải nghĩ. Trong hoàn cảnh ấy, sự hỗn loạn của chú mèo có một ích lợi bất ngờ. Khi cả người lớn lẫn trẻ con đều phải ứng biến, Gabby và Sebastian có thể thử một điều mới mà bớt cảm giác mình là hai người duy nhất chưa biết phải làm gì.',
      'Chiếc mũ phép thuật có thể tạo ra trò vui, nhưng ý tưởng đáng giữ nhất của phim nằm ở một ngày đầu được phép lộn xộn. Với một đứa trẻ vừa chuyển đến, dấu hiệu đầu tiên của việc hòa nhập đôi khi nhỏ đến mức người lớn bỏ qua: ngày mai vào lớp, nó đã biết mình muốn chào ai.',
    ],
  },
  {
    slug: 'hexed',
    movieId: 'hexed',
    layout: 'kids-magazine',
    title: 'HEXED: THẾ GIỚI PHÉP THUẬT',
    headline: 'Hexed: Thế Giới Phép Thuật — Khi sự khác biệt chính là món quà lấp lánh nhất',
    subtitle: 'Khi sự khác biệt chính là món quà lấp lánh nhất',
    year: '2026',
    ageRating: 'P',
    duration: '1h 42m',
    genre: 'Hoạt hình, Hài, Gia đình',
    rating: 8.2,
    release: '27/11/2026',
    director: 'Josie Trinidad, Jason Hand',
    cast: 'Walt Disney Animation Studios',
    posterUrl: 'https://cdn.galaxycine.vn/media/2026/9/29/haxed-500_1790654647070.jpg',
    backdropUrl: 'https://cdn.galaxycine.vn/media/2026/9/29/haxed-750_1790654648150.jpg',
    synopsis:
      'Một cậu thiếu niên hơi vụng về và người mẹ cầu toàn bất ngờ phát hiện năng lực phép thuật ẩn giấu, mở ra cánh cửa bước vào thế giới nhiệm màu đầy sắc tím xanh rực rỡ.',
    quoteBox:
      'Từ xưởng phim Walt Disney Animation, Hexed mang đến bầu không khí tưng bừng phép thuật, những màn tung chiêu dở khóc dở cười và tình cảm gia đình ấm áp cho cả trẻ em lẫn phụ huynh.',
    highlightCards: [
      {
        title: 'Phép Thuật Bùng Nổ!',
        text: 'Những tia sáng ma thuật rực rỡ và các sinh vật tí hon đáng yêu khiến mỗi khung hình đều tràn ngập năng lượng lễ hội.',
        stillIndex: 2,
      },
      {
        title: 'Hai Mẹ Con Đồng Hành',
        text: 'Không chỉ giải cứu thế giới phép thuật, mẹ và con trai còn học cách lắng nghe nhau thay vì cố ép mình vào khuôn mẫu.',
        stillIndex: 4,
      },
      {
        title: 'Vụng Về Không Sao Cả',
        text: 'Thông điệp tích cực cho các bạn nhỏ: chính những nét "khác người" đôi khi lại là siêu năng lực tuyệt vời nhất.',
        stillIndex: 5,
      },
    ],
    stills: [
      {
        url: '/images/cinema-corner/hexed/still-1.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/hexed/still-2.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/hexed/still-3.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/hexed/still-4.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/hexed/still-5.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/hexed/still-6.jpg',
        position: 'object-center',
        alt: 'Hexed: Thế Giới Phép Thuật - Cảnh 6',
      },
    ],
    paragraphs: [
      'Ngay từ những phút đầu, Hexed kéo khán giả vào một thị trấn bình yên bỗng chốc đảo lộn khi phép thuật xuất hiện đúng lúc không ai ngờ tới. Thay vì xây dựng một anh hùng hoàn hảo, bộ phim chọn một cậu bé hay lúng túng làm trung tâm — giúp các khán giả nhí dễ dàng bật cười và thấy chính mình trong đó.',
      'Điểm đáng yêu nhất của bộ phim nằm ở mối quan hệ giữa hai mẹ con. Người mẹ luôn muốn mọi thứ ngăn nắp, còn cậu con trai lại mang trong mình nguồn năng lượng bay nhảy khó đoán. Khi bị cuốn vào thế giới nhiệm màu, cả hai buộc phải phối hợp ăn ý để vượt qua thử thách, từ đó nhận ra tình thương không nằm ở việc uốn nắn người kia giống mình.',
      'Với phần hình ảnh rực rỡ sắc màu, nhịp phim rộn ràng và những bài học nhẹ nhàng về sự tự tin, Hexed là lựa chọn tuyệt vời cho buổi xem phim cuối tuần của cả gia đình — vui tươi từ đầu đến cuối mà vẫn đọng lại dư vị ấm lòng.',
    ],
  },
  {
    slug: 'shaun-the-sheep-the-beast-of-mossy-bottom',
    movieId: 'shaun-the-sheep-the-beast-of-mossy-bottom',
    layout: 'kids-magazine',
    title: 'SHAUN THE SHEEP: "QUÁI LẠ" GHÉ NHÀ',
    headline:
      'Shaun The Sheep: "Quái Lạ" Ghé Nhà — Trang trại rộn tiếng cười khi chú cừu thông minh trổ tài',
    subtitle: 'Trang trại rộn tiếng cười khi chú cừu thông minh trổ tài',
    year: '2026',
    ageRating: 'P',
    duration: '1h 28m',
    genre: 'Hoạt hình, Hài, Gia đình',
    rating: 8.4,
    release: '10/10/2026',
    director: 'Steve Cox, Matthew Walker',
    cast: 'Justin Fletcher, John Sparkes',
    posterUrl:
      'https://cdn.galaxycine.vn/media/2026/10/6/shaun-the-sheep-the-beast-of-mossy-bottom-2_1791253605720.jpg',
    backdropUrl:
      'https://cdn.galaxycine.vn/media/2026/10/6/shaun-the-sheep-the-beast-of-mossy-bottom-4_1791253612992.jpg',
    synopsis:
      'Mùa lễ hội ở nông trại Mossy Bottom bỗng náo loạn khi những quả bí ngô biến mất bí ẩn và tin đồn về một "sinh vật quái lạ" khiến đàn cừu của Shaun phải ra tay điều tra.',
    quoteBox:
      'Không cần lời thoại dài dòng, nghệ thuật hoạt hình đất sét thủ công của xưởng Aardman tiếp tục chinh phục các bạn nhỏ bằng biểu cảm ngộ nghĩnh và những tình huống hài hước trong sáng.',
    highlightCards: [
      {
        title: 'Nông Trại Rộn Ràng!',
        text: 'Từng mô hình đất sét tỉ mỉ, đồng cỏ xanh mướt và ánh đèn lễ hội tạo nên thế giới thu nhỏ cực kỳ sống động.',
        stillIndex: 0,
      },
      {
        title: 'Biệt Đội Cừu Lém Lỉnh',
        text: 'Shaun và chú chó Bitzer bày ra đủ kế hoạch tinh quái nhưng lại luôn hết lòng bảo vệ bạn bè quanh nông trại.',
        stillIndex: 2,
      },
      {
        title: 'Vui Cho Mọi Lứa Tuổi',
        text: 'Bé nhỏ cười vì hành động hài hước, người lớn mỉm cười vì sự tinh tế — cả nhà cùng tận hưởng trọn vẹn.',
        stillIndex: 4,
      },
    ],
    stills: [
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-1.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-2.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-3.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-4.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-5.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/shaun-the-sheep-the-beast-of-mossy-bottom/still-6.jpg',
        position: 'object-center',
        alt: 'Shaun The Sheep - Cảnh 6',
      },
    ],
    paragraphs: [
      'Sức hút bền bỉ của Shaun The Sheep nằm ở cách kể chuyện gần như không lời: chỉ cần một cái nhướng mày, một bước chạy lạch bạch hay một cú giật mình của đàn cừu cũng đủ làm cả rạp phim rộ lên tiếng cười. Trong phần phim mới, không khí nông trại Mossy Bottom càng thêm náo nhiệt với bí ẩn "sinh vật quái lạ".',
      'Điều thú vị cho các em nhỏ là cảm giác hồi hộp vừa đủ — không hề đáng sợ mà giống một trò chơi trốn tìm kỳ thú cùng cả đàn cừu. Mỗi lần Shaun nghĩ ra một phát minh "cây nhà lá vườn", khán giả lại được dịp hồi hộp xem mọi thứ sẽ rối tung lên đáng yêu đến mức nào.',
      'Sau tất cả những màn rượt đuổi vui nhộn, bộ phim khép lại bằng tinh thần đoàn kết giản dị: dù khác biệt ra sao, chỉ cần chịu quan tâm và giúp đỡ nhau, vị khách "quái lạ" nào cũng có thể trở thành người bạn tốt.',
    ],
  },
  {
    slug: 'scotty',
    movieId: 'scotty',
    layout: 'kids-magazine',
    title: 'SCOTTY: GIẢI CỨU HOÀNG THƯỢNG',
    headline:
      'Scotty: Giải Cứu Hoàng Thượng — Chú cún nhỏ và trái tim dũng cảm giữa chuyến phiêu lưu lớn',
    subtitle: 'Chú cún nhỏ và trái tim dũng cảm giữa chuyến phiêu lưu lớn',
    year: '2026',
    ageRating: 'P',
    duration: '1h 32m',
    genre: 'Hoạt hình, Phiêu lưu, Gia đình',
    rating: 8.1,
    release: '02/10/2026',
    director: 'CineHub Family Picks',
    cast: 'Phiên bản lồng tiếng & phụ đề thiếu nhi',
    posterUrl: 'https://cdn.galaxycine.vn/media/2026/9/28/scotty-500_1790567736139.jpg',
    backdropUrl: 'https://cdn.galaxycine.vn/media/2026/9/28/scotty-750_1790567737111.jpg',
    synopsis:
      'Chú cún Scotty tinh nghịch bất ngờ bị cuốn vào nhiệm vụ giải cứu Hoàng Thượng giữa những góc phố rực nắng, kết bạn cùng biệt đội thú cưng siêu đáng yêu trên đường đi.',
    quoteBox:
      'Nhẹ nhàng, tươi sáng và ngập tràn năng lượng tích cực, Scotty: Giải Cứu Hoàng Thượng là món quà điện ảnh ngọt ngào dành cho những khán giả nhí yêu động vật.',
    highlightCards: [
      {
        title: 'Chú Cún Siêu Đáng Yêu!',
        text: 'Tạo hình đôi tai vểnh và những pha chạy nhảy tung tăng của Scotty khiến các bé thích mê ngay từ cái nhìn đầu tiên.',
        stillIndex: 0,
      },
      {
        title: 'Hành Trình Khám Phá',
        text: 'Từ khu vườn ngập nắng đến những con đường nhộn nhịp, mỗi chặng đường đều mở ra một người bạn mới thân thiện.',
        stillIndex: 2,
      },
      {
        title: 'Nhỏ Bé Vẫn Có Ích',
        text: 'Bộ phim khích lệ sự tự tin: không cần phải thật to lớn mới làm được việc tốt — lòng tốt luôn bắt đầu từ hành động nhỏ.',
        stillIndex: 4,
      },
    ],
    stills: [
      {
        url: '/images/cinema-corner/scotty/still-1.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 1',
      },
      {
        url: '/images/cinema-corner/scotty/still-2.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 2',
      },
      {
        url: '/images/cinema-corner/scotty/still-3.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 3',
      },
      {
        url: '/images/cinema-corner/scotty/still-4.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 4',
      },
      {
        url: '/images/cinema-corner/scotty/still-5.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 5',
      },
      {
        url: '/images/cinema-corner/scotty/still-6.jpg',
        position: 'object-center',
        alt: 'Scotty: Giải Cứu Hoàng Thượng - Cảnh 6',
      },
    ],
    paragraphs: [
      'Scotty: Giải Cứu Hoàng Thượng mang đúng tinh thần của một bộ phim thiếu nhi cuối tuần: nhịp điệu tươi vui, gam màu sáng rực rỡ và dàn nhân vật thú cưng đầy cá tính. Chỉ cần chú cún Scotty vẫy đuôi bước vào khung hình là bầu không khí đã trở nên ấm áp và gần gũi.',
      'Trong hành trình tìm đường giúp Hoàng Thượng trở về an toàn, Scotty gặp không ít tình huống éo le nhưng luôn chọn cách nhìn lạc quan. Những người bạn mới xuất hiện đúng lúc không chỉ giúp chú vượt qua trở ngại mà còn dạy cho các em nhỏ bài học về tinh thần đồng đội và sự sẻ chia.',
      'Không quá ồn ào hay phức tạp, bộ phim ghi điểm nhờ sự hồn nhiên và thông điệp dễ thương: đôi khi một chú cún nhỏ bé nhất lại là người mang đến phép màu lớn nhất cho gia đình mình.',
    ],
  },
];
