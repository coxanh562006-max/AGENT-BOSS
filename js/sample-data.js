/*
 * Dữ liệu mẫu, đúng định dạng các file mà trang web đọc.
 * Dùng để thử toàn bộ chức năng trước khi nạp file thật.
 */
(function (root) {
  'use strict';

  var SAMPLE = {
    vocabLines: [
      'Từ tiếng Hàn | Nghĩa | Ví dụ tiếng Hàn | Dịch ví dụ',
      '안녕하세요 | xin chào | 안녕하세요, 저는 민수예요. | Xin chào, tôi là Minsu.',
      '감사합니다 | cảm ơn | 도와주셔서 감사합니다. | Cảm ơn vì đã giúp đỡ.',
      '학생 | học sinh | 저는 학생이에요. | Tôi là học sinh.',
      '선생님 | giáo viên | 선생님은 집에 있어요. | Giáo viên đang ở nhà.',
      '학교 | trường học | 학교에 가요. | Tôi đi đến trường.',
      '가다 | đi | 극장에 가요. | Tôi đi rạp chiếu phim.',
      '먹다 | ăn | 밥을 먹어요. | Tôi ăn cơm.',
      '마시다 | uống | 물을 마셔요. | Tôi uống nước.',
      '보다 | xem, nhìn | 영화를 봐요. | Tôi xem phim.',
      '읽다 | đọc | 책을 읽어요. | Tôi đọc sách.',
      '공부하다 | học, học tập | 매일 공부해요. | Tôi học mỗi ngày.',
      '책 | sách | 이 책은 재미있어요. | Cuốn sách này thú vị.',
      '물 | nước | 물 좀 주세요. | Làm ơn cho tôi nước.',
      '친구 | bạn bè | 제 친구예요. | Là bạn tôi.',
      '예쁘다 | đẹp | 꽃이 예뻐요. | Hoa đẹp.',
      '크다 | to, lớn | 집이 커요. | Nhà to.',
      '오늘 | hôm nay | 오늘 날씨가 좋아요. | Hôm nay thời tiết đẹp.',
      '집 | nhà | 집에 가요. | Tôi về nhà.'
    ],
    grammarLines: [
      'Mẫu | Ý nghĩa | Giải thích | Ví dụ tiếng Hàn | Ví dụ tiếng Việt',
      '-고 싶다 | muốn (làm gì) | Gắn sau động từ để diễn tả mong muốn. | 저는 한국에 가고 싶어요. | Tôi muốn đi Hàn Quốc.',
      '-아/어요 | kết thúc câu lịch sự | Gắn sau thân động từ hoặc tính từ để kết thúc câu lịch sự. | 저는 책을 읽어요. | Tôi đọc sách.',
      '-에 | ở, đến, vào | Đứng sau danh từ chỉ nơi chốn hoặc thời gian. | 저는 학교에 가요. | Tôi đi đến trường.',
      '-을/를 | (đánh dấu tân ngữ) | Đứng sau danh từ làm tân ngữ của động từ. | 물을 마셔요. | Tôi uống nước.',
      '-고 있다 | đang (làm gì) | Diễn tả hành động đang diễn ra. | 친구가 공부하고 있어요. | Bạn tôi đang học.'
    ],
    koLines: [
      '1. 저는 학생입니다.',
      '2. 오늘 학교에 가요.',
      '3. 저는 한국어를 공부해요.',
      '4. 친구가 책을 읽어요.',
      '5. 물을 마시고 싶어요.',
      '6. 선생님은 집에 있어요.',
      '7. 저는 책을 많이 읽고 있어요.',
      '8. 이 집은 아주 커요.',
      '9. 친구는 정말 예뻐요.',
      '10. 감사합니다.'
    ],
    viLines: [
      '1. Tôi là học sinh.',
      '2. Hôm nay tôi đi học.',
      '3. Tôi học tiếng Hàn.',
      '4. Bạn tôi đọc sách.',
      '5. Tôi muốn uống nước.',
      '6. Giáo viên đang ở nhà.',
      '7. Tôi đang đọc nhiều sách.',
      '8. Ngôi nhà này rất to.',
      '9. Bạn tôi thật xinh đẹp.',
      '10. Cảm ơn.'
    ],
    lectureLines: [
      '# Bài 1: Chào hỏi và đi học',
      '안녕하세요 | Xin chào',
      '한국 | Hàn Quốc',
      '저는 한국에 가고 싶어요 | Tôi muốn đi Hàn Quốc.',
      'Mẹo: đuôi -요 dùng trong câu lịch sự, thân mật.',
      '# Bài 2: Sở thích và hoạt động',
      '저는 책을 읽어요 | Tôi đọc sách.',
      'Ghi nhớ: 을/를 đứng sau danh từ làm tân ngữ.'
    ]
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SAMPLE;
  } else {
    root.HANHOC_SAMPLE = SAMPLE;
  }
})(typeof window !== 'undefined' ? window : globalThis);
