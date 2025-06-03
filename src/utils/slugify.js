/**
 * Chuyển đổi chuỗi thành slug
 * @param {string} text - Chuỗi cần chuyển đổi
 * @returns {string} - Slug đã được tạo
 */
function slugify(text) {
  if (!text) return '';
  
  // Chuyển đổi sang chữ thường và loại bỏ dấu cách đầu/cuối
  let slug = text.toString().toLowerCase().trim();

  // Thay thế các dấu tiếng Việt
  const from = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ';
  const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeediiiiioooooooooooooooouuuuuuuuuuuyyyy';
  
  for (let i = 0, l = from.length; i < l; i++) {
    slug = slug.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  // Thay thế dấu cách bằng gạch ngang
  slug = slug.replace(/\s+/g, '-')
    // Thay thế các ký tự không phải chữ cái hoặc số
    .replace(/[^a-z0-9-]/g, '')
    // Loại bỏ các dấu gạch ngang liên tiếp
    .replace(/-+/g, '-')
    // Loại bỏ dấu gạch ngang ở đầu và cuối
    .replace(/^-+|-+$/g, '');

  return slug;
}

module.exports = slugify;
