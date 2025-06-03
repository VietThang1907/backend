// src/services/elasticsearchService.js

const { Client } = require('@elastic/elasticsearch');
const config = require('../config/elasticsearch'); // Đảm bảo đường dẫn này đúng

const INDEX_NAME = 'movies'; // Tên index cho phim

// Cấu hình logging - đặt thành false để tắt tất cả các log
const DEBUG_MODE = false;

// Hàm helper để log có điều kiện
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

let client; // Biến để giữ instance của client
let esDisabled = false; // Flag để biết trạng thái ES đã được vô hiệu hóa

/**
 * Khởi tạo Elasticsearch client, kiểm tra kết nối,
 * và đảm bảo index 'movies' tồn tại với mapping chính xác.
 * Nên gọi hàm này một lần khi khởi động ứng dụng.
 * @returns {Promise<Client|null>} Elasticsearch client instance hoặc null nếu không thể kết nối
 */
async function initClient() {
  if (esDisabled) {
    debugLog('Elasticsearch functionality is disabled. Using MongoDB fallback for search.');
    return null;
  }
  
  if (client) return client; // Trả về client nếu đã khởi tạo

  debugLog('Initializing Elasticsearch client...');
  try {
    // Kiểm tra xem config.node có được cấu hình không
    if (!config.node) {
      console.warn('ELASTICSEARCH_NODE không được cấu hình trong .env. Elasticsearch bị tắt.');
      esDisabled = true;
      return null;
    }

    // Khởi tạo client với cấu hình từ file config
    client = new Client({
      node: config.node,
      maxRetries: 2,
      requestTimeout: 10000, // Timeout 10s
      ssl: {
        rejectUnauthorized: false // Tắt xác minh SSL (chỉ dùng cho môi trường dev)
      }
    });

    // Sử dụng info API bằng cách tương thích với phiên bản cũ hơn
    try {
      // Gọi info API không có tham số phụ để tránh lỗi với các server phiên bản cũ
      const info = await client.info();
      
      if (info && info.version) {
        debugLog('Elasticsearch connection successful. Version:', info.version.number || 'unknown');
      } else {
        debugLog('Elasticsearch connection successful, but version info is unavailable');
      }
      
      // Tạo index và mapping nếu chưa tồn tại
      await createIndexIfNotExists();
      debugLog('Elasticsearch service initialized successfully.');
      return client;
    } catch (pingError) {
      console.error('Error during Elasticsearch connection test:', pingError.message);
      if (pingError.meta?.statusCode === 400) {
        console.error('Elasticsearch server returned HTTP 400 Bad Request. Possible causes:');
        console.error('- Server is not Elasticsearch but something else on the same port');
        console.error('- Elasticsearch security settings are rejecting the connection');
        console.error('- Compatibility issue between client v9 and server version');
        console.error('  Try downgrading client to v7 with: npm install @elastic/elasticsearch@7');
      }
      throw pingError;
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch client:', error.message);
    if (error.meta) {
      console.error(`Status code: ${error.meta.statusCode}, Body:`, error.meta.body);
    }
    // Đánh dấu ES là bị vô hiệu hóa để không cố kết nối lại
    esDisabled = true;
    // Không ném lỗi nữa, chỉ trả về null và tiếp tục ứng dụng
    return null;
  }
}

/**
 * Tạo index 'movies' nếu nó chưa tồn tại, với mapping được định nghĩa sẵn.
 * Chỉ nên được gọi bởi initClient() hoặc trong các trường hợp đặc biệt.
 * @private
 * @throws {Error} Nếu không thể tạo index
 */
async function createIndexIfNotExists() {
  if (!client) throw new Error('Elasticsearch client not initialized');
  debugLog(`Checking existence of index "${INDEX_NAME}"...`);
  
  try {
      // Kiểm tra sự tồn tại của index theo cách tương thích với nhiều phiên bản
      let indexExists = false;
      
      try {
          // Phiên bản 9.x, 8.x, 7.x API
          const response = await client.indices.exists({ index: INDEX_NAME });
          
          // Xử lý phản hồi theo cấu trúc phiên bản
          if (typeof response === 'boolean') {
              // Client v7 API
              indexExists = response;
          } else if (response && typeof response === 'object') {
              if (response.body !== undefined) {
                  // Client v8 API
                  indexExists = !!response.body;
              } else if (response.statusCode !== undefined) {
                  // Phản hồi dựa trên statusCode
                  indexExists = response.statusCode === 200;
              } else {
                  // Client v9 API hoặc khác
                  indexExists = true; // Nếu không có lỗi, giả định là tồn tại
              }
          }
      } catch (existsError) {
          // Nếu không thể kiểm tra bằng API hiện đại, thử cách cũ
          try {
              const getResponse = await client.indices.get({ index: INDEX_NAME, ignore: [404] });
              indexExists = !(getResponse.statusCode === 404);
          } catch (getError) {
              // Nếu cả hai phương pháp đều thất bại, giả định index không tồn tại
              console.warn(`Unable to check index existence: ${getError.message}`);
              indexExists = false;
          }
      }

      debugLog(`Index "${INDEX_NAME}" exists: ${indexExists}`);

      if (!indexExists) {
          debugLog(`Creating index "${INDEX_NAME}"...`);
          
          // Tạo cấu trúc request tương thích với nhiều phiên bản
          const createParams = {
              index: INDEX_NAME
          };
          
          // body là tham số riêng trong v7, nhưng là một phần của params chính trong v8/v9
          const mappings = {
              properties: {
                  name: { type: 'text' },
                  origin_name: { type: 'text' },
                  content: { type: 'text' },
                  actor: { type: 'text' },
                  director: { type: 'text' },
                  slug: { type: 'keyword' },
                  type: { type: 'keyword' },
                  status: { type: 'keyword' },
                  quality: { type: 'keyword' },
                  lang: { type: 'keyword' },
                  year: { type: 'integer' },
                  view: { type: 'integer' },
                  is_copyright: { type: 'boolean' },
                  chieurap: { type: 'boolean' },
                  sub_docquyen: { type: 'boolean' },
                  tmdb: {
                      properties: {
                          vote_average: { type: 'float' },
                          vote_count: { type: 'integer' }
                      }
                  },
                  imdb: {
                      properties: {
                          id: { type: 'keyword' }
                      }
                  },
                  created: {
                      properties: {
                          time: { type: 'date' }
                      }
                  },
                  modified: {
                      properties: {
                          time: { type: 'date' }
                      }
                  },
                  category: {
                      type: 'nested',
                      properties: {
                          name: {
                              type: 'text',
                              fields: {
                                  keyword: { type: 'keyword', ignore_above: 256 }
                              }
                          },
                          slug: { type: 'keyword' }
                      }
                  },
                  country: {
                      type: 'nested',
                      properties: {
                          name: {
                              type: 'text',
                              fields: {
                                  keyword: { type: 'keyword', ignore_above: 256 }
                              }
                          },
                          slug: { type: 'keyword' }
                      }
                  }
              }
          };
          
          // Kiểm tra phiên bản client để định dạng request phù hợp
          try {
              // Thử API phiên bản 7
              await client.indices.create({
                  index: INDEX_NAME,
                  body: {
                      mappings: mappings
                  }
              });
          } catch (createError) {
              // Nếu lỗi thì có thể là phiên bản mới hơn hoặc khác
              if (createError.message && createError.message.includes('unknown parameter')) {
                  // Thử API mới (v8, v9)
                  await client.indices.create({
                      index: INDEX_NAME,
                      mappings: mappings
                  });
              } else if (createError.meta && createError.meta.body && 
                        createError.meta.body.error && 
                        createError.meta.body.error.type === 'resource_already_exists_exception') {
                  // Index đã tồn tại (có thể do race condition)
                  debugLog(`Index "${INDEX_NAME}" already exists (checked during creation).`);
              } else {
                  // Lỗi khác - ném ra để xử lý ở catch bên ngoài
                  throw createError;
              }
          }
          debugLog(`Index "${INDEX_NAME}" created successfully.`);
      } else {
          debugLog(`Index "${INDEX_NAME}" already exists. Skipping creation.`);
      }
  } catch (error) {
      console.error(`Error during index check/creation for "${INDEX_NAME}":`, error);
      // Ghi lại chi tiết lỗi để gỡ lỗi
      if (error.meta && error.meta.body) {
          console.error('Error details:', error.meta.body);
      }
      
      // Không ném lỗi nếu là lỗi "đã tồn tại"
      if (error.meta && error.meta.body && error.meta.body.error && 
         error.meta.body.error.type === 'resource_already_exists_exception') {
          debugLog(`Index "${INDEX_NAME}" already exists (error caught). Continuing.`);
          return;
      }
      
      throw error; // Ném lại lỗi nếu không phải là trường hợp xử lý được
  }
}

/**
 * Index (thêm mới hoặc cập nhật) một document phim vào Elasticsearch.
 * @param {object} doc - Document phim lấy từ MongoDB (nên là plain object).
 * @returns {Promise<void>}
 */
async function indexDocument(doc) {
  if (!client) throw new Error('Elasticsearch client not initialized. Call initClient() first.');

  const plainDoc = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const docId = plainDoc._id ? plainDoc._id.toString() : null;

  if (!docId) {
      console.error('Document missing _id, cannot index:', plainDoc);
      return;
  }

  const docToIndex = { ...plainDoc };
  delete docToIndex.episodes;
  delete docToIndex.__v;
  delete docToIndex._id; 

  debugLog(`Indexing document ID: ${docId}...`);
  try {
      // Sử dụng cấu trúc chính xác cho phiên bản 7.x của client
      const indexParams = {
          index: INDEX_NAME,
          id: docId,
          body: docToIndex,
          refresh: false
      };
      
      await client.index(indexParams);
      debugLog(` -> Document ID: ${docId} indexed successfully`);
  } catch (error) {
      console.error(` -> ERROR indexing document ID: ${docId}:`, error.message);
      if (error.meta?.body?.error) {
          console.error('Error details:', error.meta.body.error);
      }
  }
}

/**
 * Xóa một document phim khỏi Elasticsearch index bằng ID.
 * @param {string|ObjectId} docId - ID của document cần xóa.
 * @returns {Promise<void>}
 */
async function deleteDocument(docId) {
  if (!client) throw new Error('Elasticsearch client not initialized. Call initClient() first.');
  const idString = docId.toString();

  try {
      await client.delete({
          index: INDEX_NAME,
          id: idString
      });
      debugLog(`Document ${idString} deleted successfully.`);
  } catch (error) {
      // Bỏ qua lỗi nếu document không tồn tại
      if (error.meta && error.meta.statusCode === 404) {
          return;
      }
      console.error(`Error deleting document ${idString}:`, error.message);
  }
}

/**
 * Tìm kiếm phim trong Elasticsearch với hỗ trợ ngôn ngữ tự nhiên
 * @param {string} query - Từ khóa tìm kiếm
 * @param {string|null} field - Trường cụ thể để tìm kiếm (null = tìm tất cả)
 * @param {number} size - Số kết quả trên một trang
 * @param {number} from - Vị trí bắt đầu lấy kết quả
 * @param {Object} filters - Bộ lọc bổ sung (thể loại, năm, quốc gia, etc.)
 * @returns {Promise<Array>} - Danh sách phim tìm thấy
 */
async function searchMovies(query, field = null, size = 20, from = 0, filters = {}) {
  if (!client) throw new Error('Elasticsearch client not initialized. Call initClient() first.');
  
  // Đảm bảo các tham số pagination hợp lệ
  const safeSize = Math.max(1, Math.min(100, parseInt(size) || 20));
  const safeFrom = Math.max(0, parseInt(from) || 0);
  
  try {
    // Xử lý ngôn ngữ tự nhiên
    const processedQuery = preprocessQuery(query);
    
    // Xây dựng câu truy vấn
    const searchBody = buildSearchQuery(processedQuery, field, filters);
    
    const searchParams = {
      index: INDEX_NAME,
      body: searchBody,
      from: safeFrom,
      size: safeSize
    };

    debugLog('Executing Elasticsearch query:', JSON.stringify(searchParams, null, 2));
    
    const response = await client.search(searchParams);
    
    // Xử lý kết quả từ Elasticsearch
    const hits = response.body.hits.hits.map(hit => {
      const source = { ...hit._source };
      
      // Nếu cần lọc theo độ dài và không có trong ES, tính toán độ dài từ thông tin episodes
      if (filters.duration && !source.duration && source.episodes && source.episodes.length > 0) {
        let totalDuration = 0;
        // Tính tổng thời lượng phim từ episodes nếu có
        if (source.type === 'single' && source.episodes[0] && source.episodes[0].server_data && source.episodes[0].server_data.length > 0) {
          // Lấy thời lượng của tập đầu tiên nếu có
          const firstEpisodeDuration = source.episodes[0].server_data[0].duration;
          if (firstEpisodeDuration) {
            totalDuration = parseInt(firstEpisodeDuration) || 0;
          }
        }
        source.duration = totalDuration;
      }
      
      return {
        id: hit._id,
        score: hit._score,
        ...source,
        highlight: hit.highlight
      };
    });

    // Nếu có bộ lọc duration, lọc thêm kết quả
    let filteredHits = hits;
    let totalBeforeFilter = response.body.hits.total.value || 0;
    
    if (filters.duration) {
      filteredHits = filterByDuration(hits, filters.duration);
      
      // Ước tính tổng số kết quả dựa trên tỉ lệ lọc
      if (hits.length > 0) {
        // Tính tỉ lệ phim thỏa mãn điều kiện lọc trong trang hiện tại
        const filterRatio = filteredHits.length / hits.length;
        // Ước tính tổng số phim thỏa mãn trong toàn bộ kết quả 
        totalBeforeFilter = Math.ceil(totalBeforeFilter * filterRatio);
        debugLog(`Estimated total after duration filter: ${totalBeforeFilter} (filter ratio: ${filterRatio})`);
      }
    }

    return {
      hits: filteredHits,
      total: totalBeforeFilter, // Sử dụng tổng số ước tính nếu có bộ lọc độ dài
      maxScore: response.body.hits.max_score || 0
    };
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    throw error;
  }
}

/**
 * Lọc kết quả tìm kiếm theo độ dài video
 * @param {Array} hits - Danh sách phim từ kết quả tìm kiếm
 * @param {string} durationType - Loại độ dài: short, medium, long
 * @returns {Array} - Danh sách phim đã lọc
 */
function filterByDuration(hits, durationType) {
  if (!durationType) return hits;
  
  debugLog(`Filtering ${hits.length} movies by duration: ${durationType}`);
  
  // Định nghĩa phạm vi thời lượng cho mỗi loại
  const durationRanges = {
    short: { min: 0, max: 59 },    // Dưới 60 phút/tập
    medium: { min: 60, max: 120 }, // Từ 60 đến 120 phút/tập
    long: { min: 121, max: 99999 } // Trên 120 phút/tập
  };
  
  return hits.filter(movie => {
    // Tìm thời lượng từ các nguồn dữ liệu khác nhau
    let duration = 0;
    
    // Kiểm tra trường duration trực tiếp nếu có
    if (movie.duration && !isNaN(parseInt(movie.duration))) {
      duration = parseInt(movie.duration);
    }
    // Hoặc kiểm tra trường time
    else if (movie.time && !isNaN(parseInt(movie.time))) {
      duration = parseInt(movie.time);
    }
    // Hoặc kiểm tra trường runtime
    else if (movie.runtime && !isNaN(parseInt(movie.runtime))) {
      duration = parseInt(movie.runtime);
    }
    // Tìm từ episode_current nếu có chứa số phút (vd: "45 phút")
    else if (movie.episode_current && typeof movie.episode_current === 'string') {
      const match = movie.episode_current.match(/(\d+)\s*phút/);
      if (match && match[1]) {
        duration = parseInt(match[1]);
      }
    }
    
    // Nếu không tìm thấy thông tin thời lượng, sử dụng giá trị mặc định
    if (duration <= 0) {
      duration = 90; // Giá trị mặc định là 90 phút/tập
    }
    
    // Kiểm tra xem thời lượng có thuộc khoảng được yêu cầu không
    const range = durationRanges[durationType];
    const result = duration >= range.min && duration <= range.max;
    
    debugLog(`Movie ${movie.name} with duration ${duration} minutes included in ${durationType} filter: ${result}`);
    return result;
  });
}

/**
 * Tiền xử lý câu truy vấn để hỗ trợ tìm kiếm ngôn ngữ tự nhiên tốt hơn
 * @param {string} query - Câu truy vấn gốc
 * @returns {Object} - Thông tin query đã xử lý
 */
function preprocessQuery(query) {
  if (!query) return { original: '', processed: '', intent: 'general' };
  
  const original = query.trim();
  let processed = original;
  let intent = 'general';
  let extractedYear = null;
  let extractedGenre = null;
  let extractedCountry = null;
  let extractedDirector = null;
  let extractedActor = null;
  
  // Kiểm tra nếu query là một từ khóa ngắn hoặc là một phần của tên phim
  // thì bỏ qua việc xử lý tiền xử lý phức tạp và trực tiếp trả về query gốc
  if (original.length < 15 && !original.includes(' ')) {
    return { 
      original, 
      processed: original, 
      intent: 'general',
      year: null,
      genre: null,
      country: null,
      director: null,
      actor: null
    };
  }
  
  // Nhận diện ý định tìm kiếm từ câu truy vấn với các mẫu đa dạng hơn
  
  // Mẫu nhận dạng năm - chỉ áp dụng nếu có từ khóa chỉ định rõ ràng
  const yearPatterns = [
    /\b(phim |movie |film )(năm|year|in|của năm|from|from year|xuất bản năm|sản xuất năm|ra mắt năm|công chiếu năm)\s?(\d{4})\b/i,
    /\bnăm (\d{4})\b/i,
  ];
  
  // Mẫu nhận dạng thể loại - chỉ áp dụng khi có từ khóa định danh
  const genrePatterns = [
    /\b(phim |movie |film )(thể loại|genre|loại|kiểu|dạng|chủ đề|thể loại phim|loại phim|kiểu phim|phim loại)\s+([a-zA-ZÀ-ỹ\s]+)(phim)?\b/i,
    /\b(phim|movie|film) ([a-zA-ZÀ-ỹ\s]+) (thể loại|genre|loại|kiểu|dạng|chủ đề)\b/i,
  ];
  
  // Mẫu nhận dạng quốc gia - chỉ áp dụng khi có từ khóa định danh
  const countryPatterns = [
    /\b(phim |movie |film )(quốc gia|country|nước|đất nước|của|xuất xứ|nguồn gốc|sản xuất tại)\s+([a-zA-ZÀ-ỹ\s]+)\b/i,
    /\b(phim|movie|film) ([a-zA-ZÀ-ỹ\s]+) (quốc gia|country|nước|đất nước)\b/i,
  ];
  
  // Mẫu nhận dạng đạo diễn - chỉ áp dụng khi có từ khóa định danh
  const directorPatterns = [
    /\b(phim |movie |film )(đạo diễn|director|của đạo diễn|do đạo diễn)\s+([a-zA-ZÀ-ỹ\s]+)\b/i,
    /\b(đạo diễn|director) ([a-zA-ZÀ-ỹ\s]+)\b/i,
  ];
  
  // Mẫu nhận dạng diễn viên - chỉ áp dụng khi có từ khóa định danh
  const actorPatterns = [
    /\b(phim |movie |film )(diễn viên|actor|có diễn viên|với diễn viên|starring|với sự tham gia của|diễn xuất bởi|do diễn viên)\s+([a-zA-ZÀ-ỹ\s]+)\b/i,
    /\bdo ([a-zA-ZÀ-ỹ\s]+) (đóng|thủ vai|diễn xuất|thể hiện)\b/i,
  ];
  // Kiểm tra xem câu truy vấn có phải là một từ khóa đặc biệt không
  // Nếu là từ khóa đặc biệt như "nguồn gốc" thì không cần xử lý pattern
  const specialKeywords = [
    'nguồn gốc', 'nguồn', 'gốc', 'nguồn gốc tội lỗi', 'nguồn gốc đại chiến',
    'nguyên tác', 'tác giả', 'gốc gác', 'bối cảnh', 'cội nguồn', 'xuất xứ'
  ];
  
  // Kiểm tra xem query có phải là từ khóa đặc biệt không
  const isSpecialKeyword = specialKeywords.some(keyword => 
    original.toLowerCase().includes(keyword.toLowerCase()));
  
  if (isSpecialKeyword) {
    return {
      original,
      processed: original,
      intent: 'general',
      year: null,
      genre: null,
      country: null,
      director: null,
      actor: null
    };
  }

  // Trích xuất năm
  for (const pattern of yearPatterns) {
    const yearMatch = processed.match(pattern);
    if (yearMatch) {
      // Lấy số năm từ kết quả match, tùy thuộc vào mẫu pattern
      extractedYear = yearMatch[3] || yearMatch[1];
      // Lưu lại phần văn bản gốc trước khi thay thế
      const originalText = yearMatch[0];
      processed = processed.replace(originalText, ' ').trim();
      intent = intent === 'general' ? 'year_search' : 'complex_search';
      break;
    }
  }
  
  // Trích xuất thể loại
  for (const pattern of genrePatterns) {
    const genreMatch = processed.match(pattern);
    if (genreMatch) {
      // Dựa vào pattern, lấy tên thể loại ở vị trí thích hợp
      extractedGenre = genreMatch[3] || genreMatch[2];
      if (extractedGenre) {
        extractedGenre = extractedGenre.trim();
        // Lưu lại phần văn bản gốc trước khi thay thế
        const originalText = genreMatch[0];
        processed = processed.replace(originalText, ' ').trim();
        intent = intent === 'general' ? 'genre_search' : 'complex_search';
        break;
      }
    }
  }
  
  // Trích xuất quốc gia
  for (const pattern of countryPatterns) {
    const countryMatch = processed.match(pattern);
    if (countryMatch) {
      // Dựa vào pattern, lấy tên quốc gia ở vị trí thích hợp
      extractedCountry = countryMatch[3] || countryMatch[2];
      if (extractedCountry) {
        extractedCountry = extractedCountry.trim();
        // Lưu lại phần văn bản gốc trước khi thay thế
        const originalText = countryMatch[0];
        processed = processed.replace(originalText, ' ').trim();
        intent = intent === 'general' ? 'country_search' : 'complex_search';
        break;
      }
    }
  }
    // Trích xuất đạo diễn
  for (const pattern of directorPatterns) {
    const directorMatch = processed.match(pattern);
    if (directorMatch) {
      extractedDirector = directorMatch[3] || directorMatch[2];
      if (extractedDirector) {
        extractedDirector = extractedDirector.trim();
        const originalText = directorMatch[0];
        processed = processed.replace(originalText, ' ').trim();
        intent = intent === 'general' ? 'director_search' : 'complex_search';
        break;
      }
    }
  }
  
  // Trích xuất diễn viên
  for (const pattern of actorPatterns) {
    const actorMatch = processed.match(pattern);
    if (actorMatch) {
      extractedActor = actorMatch[3] || actorMatch[2] || actorMatch[1];
      if (extractedActor) {
        extractedActor = extractedActor.trim();
        const originalText = actorMatch[0];
        processed = processed.replace(originalText, ' ').trim();
        intent = intent === 'general' ? 'actor_search' : 'complex_search';
        break;
      }
    }
  }
  
  // Loại bỏ các từ khóa không cần thiết và stopwords
  const stopwords = ['phim', 'movie', 'xem', 'watch', 'tìm', 'search', 'find', 'film', 'về', 'về phim', 'hay', 'mới', 'hot', 'bộ', 'lẻ', 'full', 'hd', 'vietsub', 'thuyết minh', 'lồng tiếng'];
  
  const processedWords = processed.split(/\s+/).filter(word => {
    // Loại bỏ các từ ngừng, nhưng giữ lại các từ có ý nghĩa như tên diễn viên/đạo diễn
    return !stopwords.includes(word.toLowerCase());
  });
  
  processed = processedWords.join(' ').trim();
  
  // Trường hợp đặc biệt: Nếu không còn từ nào trong processed nhưng có thông tin trích xuất
  if (!processed && (extractedYear || extractedGenre || extractedCountry || extractedDirector || extractedActor)) {
    // Giữ lại một phần của truy vấn gốc để tránh mất thông tin
    const originalWords = original.split(/\s+/);
    const significantWords = originalWords.filter(word => !stopwords.includes(word.toLowerCase()));
    
    if (significantWords.length > 0) {
      processed = significantWords.slice(0, 2).join(' '); // Lấy tối đa 2 từ quan trọng
    }
  }
  
  // Map các tên quốc gia/thể loại tới giá trị tiêu chuẩn
  if (extractedCountry) {
    const countryMap = {
      'mỹ': 'Âu Mỹ',
      'my': 'Âu Mỹ',
      'america': 'Âu Mỹ',
      'american': 'Âu Mỹ',
      'us': 'Âu Mỹ',
      'usa': 'Âu Mỹ',
      'anh': 'Âu Mỹ',
      'úc': 'Âu Mỹ',
      'pháp': 'Âu Mỹ',
      'phap': 'Âu Mỹ',
      'trung': 'Trung Quốc',
      'trung quốc': 'Trung Quốc',
      'trung quoc': 'Trung Quốc',
      'china': 'Trung Quốc',
      'chinese': 'Trung Quốc',
      'hàn': 'Hàn Quốc',
      'han': 'Hàn Quốc',
      'hàn quốc': 'Hàn Quốc',
      'han quoc': 'Hàn Quốc',
      'korea': 'Hàn Quốc',
      'korean': 'Hàn Quốc',
      'nhật': 'Nhật Bản',
      'nhat': 'Nhật Bản',
      'nhật bản': 'Nhật Bản',
      'nhat ban': 'Nhật Bản',
      'japan': 'Nhật Bản',
      'japanese': 'Nhật Bản',
      'việt': 'Việt Nam',
      'viet': 'Việt Nam',
      'việt nam': 'Việt Nam',
      'viet nam': 'Việt Nam',
      'vietnam': 'Việt Nam',
      'vietnamese': 'Việt Nam',
      'thái': 'Thái Lan',
      'thai': 'Thái Lan',
      'thái lan': 'Thái Lan',
      'thai lan': 'Thái Lan',
      'thailand': 'Thái Lan',
      'đài': 'Đài Loan',
      'đài loan': 'Đài Loan',
      'dai loan': 'Đài Loan',
      'taiwan': 'Đài Loan',
      'taiwanese': 'Đài Loan',
      'hồng kông': 'Hồng Kông',
      'hong kong': 'Hồng Kông',
      'hongkong': 'Hồng Kông',
      'ấn độ': 'Ấn Độ',
      'an do': 'Ấn Độ',
      'india': 'Ấn Độ',
      'indian': 'Ấn Độ'
    };
    
    const normalizedCountry = extractedCountry.toLowerCase();
    if (countryMap[normalizedCountry]) {
      extractedCountry = countryMap[normalizedCountry];
    }
  }
  
  if (extractedGenre) {
    const genreMap = {
      'hành động': 'Hành Động',
      'hanh dong': 'Hành Động',
      'action': 'Hành Động',
      'chiến đấu': 'Hành Động',
      'tình cảm': 'Tình Cảm',
      'tinh cam': 'Tình Cảm',
      'tình yêu': 'Tình Cảm',
      'romance': 'Tình Cảm',
      'romantic': 'Tình Cảm',
      'lãng mạn': 'Tình Cảm',
      'lang man': 'Tình Cảm',
      'hài': 'Hài Hước',
      'hai': 'Hài Hước',
      'hài hước': 'Hài Hước',
      'hai huoc': 'Hài Hước',
      'comedy': 'Hài Hước',
      'vui nhộn': 'Hài Hước',
      'hài kịch': 'Hài Hước',
      'cổ trang': 'Cổ Trang',
      'co trang': 'Cổ Trang',
      'historical': 'Cổ Trang',
      'tâm lý': 'Tâm Lý',
      'tam ly': 'Tâm Lý',
      'psychological': 'Tâm Lý',
      'drama': 'Tâm Lý',
      'kịch tính': 'Tâm Lý',
      'hình sự': 'Hình Sự',
      'hinh su': 'Hình Sự',
      'crime': 'Hình Sự',
      'tội phạm': 'Hình Sự',
      'toi pham': 'Hình Sự',
      'chiến tranh': 'Chiến Tranh',
      'chien tranh': 'Chiến Tranh',
      'war': 'Chiến Tranh',
      'thể thao': 'Thể Thao',
      'the thao': 'Thể Thao',
      'sport': 'Thể Thao',
      'võ thuật': 'Võ Thuật',
      'vo thuat': 'Võ Thuật',
      'martial arts': 'Võ Thuật',
      'kung fu': 'Võ Thuật',
      'viễn tưởng': 'Viễn Tưởng',
      'vien tuong': 'Viễn Tưởng',
      'sci-fi': 'Viễn Tưởng',
      'science fiction': 'Viễn Tưởng',
      'khoa học viễn tưởng': 'Viễn Tưởng',
      'phiêu lưu': 'Phiêu Lưu',
      'phieu luu': 'Phiêu Lưu',
      'adventure': 'Phiêu Lưu',
      'mạo hiểm': 'Phiêu Lưu',
      'khoa học': 'Khoa Học',
      'khoa hoc': 'Khoa Học',
      'science': 'Khoa Học',
      'kinh dị': 'Kinh Dị',
      'kinh di': 'Kinh Dị',
      'horror': 'Kinh Dị',
      'ma quái': 'Kinh Dị',
      'ma quai': 'Kinh Dị',
      'thriller': 'Kinh Dị',
      'rùng rợn': 'Kinh Dị',
      'rung ron': 'Kinh Dị',
      'âm nhạc': 'Âm Nhạc',
      'am nhac': 'Âm Nhạc',
      'music': 'Âm Nhạc',
      'nhạc': 'Âm Nhạc',
      'thần thoại': 'Thần Thoại',
      'than thoai': 'Thần Thoại',
      'mythology': 'Thần Thoại',
      'hoạt hình': 'Hoạt Hình',
      'hoat hinh': 'Hoạt Hình',
      'animation': 'Hoạt Hình',
      'cartoon': 'Hoạt Hình',
      'anime': 'Hoạt Hình'
    };
    
    const normalizedGenre = extractedGenre.toLowerCase();
    if (genreMap[normalizedGenre]) {
      extractedGenre = genreMap[normalizedGenre];
    }
  }
  
  return {
    original,
    processed,
    intent,
    year: extractedYear,
    genre: extractedGenre,
    country: extractedCountry,
    director: extractedDirector,
    actor: extractedActor
  };
}

/**
 * Xây dựng truy vấn Elasticsearch dựa trên ý định tìm kiếm
 * @param {Object} queryInfo - Thông tin query đã xử lý
 * @param {string|null} field - Trường cụ thể được chỉ định
 * @param {Object} filters - Bộ lọc bổ sung
 * @returns {Object} - Truy vấn Elasticsearch
 */
function buildSearchQuery(queryInfo, field, filters) {
  const { original, processed, intent, year, genre, country, director, actor } = queryInfo;
  
  // Kiểm tra xem có tìm kiếm theo content hay không
  const searchDescription = filters.search_description === true || filters.search_description === 'true';
  const searchAllFields = filters.search_all_fields === true || filters.search_all_fields === 'true';
  
  // Khởi tạo query với bool query
  const searchBody = {
    query: {
      bool: {
        must: [],
        should: [],
        filter: [
          // Thêm điều kiện lọc bỏ các phim đã bị ẩn
          {
            bool: {
              must_not: [
                { term: { isHidden: true } }
              ]
            }
          }
        ]
      }
    },
    highlight: {
      fields: {
        name: { number_of_fragments: 3 },
        origin_name: { number_of_fragments: 3 },
        content: { fragment_size: 150, number_of_fragments: 3 }
      },
      pre_tags: ['<em>'],
      post_tags: ['</em>']
    }
  };
  
  // Xử lý trường cụ thể nếu được cung cấp
  if (field) {
    if (field === 'content' || field === 'mô tả' || field === 'nội dung') {
      // Tìm kiếm cụ thể trong nội dung mô tả
      searchBody.query.bool.must.push({ 
        match: { 
          content: {
            query: processed,
            boost: 5 // Tăng trọng số khi tìm kiếm cụ thể trong content
          }
        } 
      });
    } else if (field === 'year' || field === 'năm') {
      searchBody.query.bool.must.push({ 
        term: { year: parseInt(processed) || parseInt(year) || 0 } 
      });
    } else if (['category', 'country', 'thể loại', 'quốc gia', 'đất nước'].includes(field)) {
      const path = field === 'category' || field === 'thể loại' ? 'category' : 'country';
      searchBody.query.bool.must.push({
        nested: {
          path: path,
          query: {
            bool: {
              should: [
                { match: { [`${path}.name`]: processed } },
                { match: { [`${path}.slug`]: processed } }
              ]
            }
          }
        }
      });
    } else if (field === 'director' || field === 'đạo diễn') {
      searchBody.query.bool.must.push({ match: { director: processed } });
    } else if (field === 'actor' || field === 'diễn viên') {
      searchBody.query.bool.must.push({ match: { actor: processed } });
    } else {
      searchBody.query.bool.must.push({ match: { [field]: processed } });
    }
  }   // Xử lý truy vấn đa trường với trọng số nếu không chỉ định trường cụ thể
  else if (processed) {
    // Điều chỉnh trọng số cho content khi tìm kiếm nội dung
    const contentBoost = searchDescription ? 3 : 1;
    
    // Tăng số trường tìm kiếm nếu searchAllFields được bật
    const searchFields = searchAllFields ? 
      [`name^5`, `origin_name^4`, `content^${contentBoost}`, `actor^3.5`, `director^3.5`] :
      [`name^4`, `origin_name^3`, `content^${contentBoost}`, `actor^2`, `director^2`];
    
    // Nếu processed và original khác nhau (đã qua tiền xử lý), 
    // sử dụng cả hai để đảm bảo tìm kiếm chính xác
    const queryToUse = queryInfo.original !== processed && queryInfo.original.length > 0 
      ? queryInfo.original 
      : processed;
    
    searchBody.query.bool.must.push({
      multi_match: {
        query: queryToUse,
        fields: searchFields,
        type: 'best_fields',
        fuzziness: 'AUTO',
        prefix_length: 1
      }
    });
      // Nếu tìm kiếm theo mô tả, thêm trọng số cho các match trong content
    if (searchDescription) {
      searchBody.query.bool.should.push({
        match: {
          content: {
            query: queryToUse,
            boost: 1.5
          }
        }
      });
      
      // Khi tìm theo mô tả, thêm tìm kiếm match_phrase cho content
      searchBody.query.bool.should.push({
        match_phrase: {
          content: {
            query: queryToUse,
            boost: 2,
            slop: 3
          }
        }
      });
    }
    
    // Tìm kiếm diễn viên chính xác
    searchBody.query.bool.should.push({
      match_phrase: {
        actor: {
          query: queryToUse,
          boost: 4,
          slop: 0
        }
      }
    });
    
    // Tìm kiếm đạo diễn chính xác
    searchBody.query.bool.should.push({
      match_phrase: {
        director: {
          query: queryToUse,
          boost: 4,
          slop: 0
        }
      }
    });
      // Thêm yếu tố tăng cường cho tên phim chính xác
    searchBody.query.bool.should.push({
      match_phrase: {
        name: {
          query: queryToUse,
          boost: 5,
          slop: 1
        }
      }
    });
    
    // Tìm phim có tên tiếng Việt gần giống
    searchBody.query.bool.should.push({
      match_phrase: {
        name: {
          query: queryToUse,
          boost: 3,
          slop: 2  // Cho phép thay đổi vị trí từ
        }
      }
    });
    
    // Tìm phim có tên gốc gần giống
    searchBody.query.bool.should.push({
      match_phrase: {
        origin_name: {
          query: queryToUse,
          boost: 2.5,
          slop: 2
        }
      }
    });
    
    // Tìm phim có tên tiếng Việt gần giống
    searchBody.query.bool.should.push({
      match_phrase: {
        name: {
          query: processed,
          boost: 3,
          slop: 2  // Cho phép thay đổi vị trí từ
        }
      }
    });
    
    // Tìm phim có tên gốc gần giống
    searchBody.query.bool.should.push({
      match_phrase: {
        origin_name: {
          query: processed,
          boost: 2.5,
          slop: 2
        }
      }
    });
    
    // Khi tìm theo mô tả, thêm tìm kiếm match_phrase cho content
    if (searchDescription) {
      searchBody.query.bool.should.push({
        match_phrase: {
          content: {
            query: processed,
            boost: 2,
            slop: 3
          }
        }
      });
    }
    
    // Tìm kiếm diễn viên chính xác
    searchBody.query.bool.should.push({
      match_phrase: {
        actor: {
          query: processed,
          boost: 4,
          slop: 0
        }
      }
    });
    
    // Tìm kiếm đạo diễn chính xác
    searchBody.query.bool.should.push({
      match_phrase: {
        director: {
          query: processed,
          boost: 4,
          slop: 0
        }
      }
    });
  }
  
  // Thêm bộ lọc từ thông tin trích xuất từ câu truy vấn
  if (year && intent !== 'general') {
    searchBody.query.bool.filter.push({ term: { year: parseInt(year) } });
  }
  
  if (genre && intent !== 'general') {
    searchBody.query.bool.filter.push({
      nested: {
        path: 'category',
        query: {
          bool: {
            should: [
              { match: { 'category.name': genre } },
              { match: { 'category.slug': genre } }
            ]
          }
        }
      }
    });
  }
  
  if (country && intent !== 'general') {
    searchBody.query.bool.filter.push({
      nested: {
        path: 'country',
        query: {
          bool: {
            should: [
              { match: { 'country.name': country } },
              { match: { 'country.slug': country } }
            ]
          }
        }
      }
    });
  }
  
  if (director && intent !== 'general') {
    searchBody.query.bool.filter.push({ match: { director: director } });
  }
  
  if (actor && intent !== 'general') {
    searchBody.query.bool.filter.push({ match: { actor: actor } });
  }
  
  // Thêm bộ lọc từ tham số filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      
      if (key === 'year' && value) {
        searchBody.query.bool.filter.push({ term: { year: parseInt(value) } });
      } else if (key === 'genre' || key === 'category') {
        searchBody.query.bool.filter.push({
          nested: {
            path: 'category',
            query: {
              bool: {
                should: [
                  { match: { 'category.name': value } },
                  { match: { 'category.slug': value } }
                ]
              }
            }
          }
        });
      } else if (key === 'country') {
        searchBody.query.bool.filter.push({
          nested: {
            path: 'country',
            query: {
              bool: {
                should: [
                  { match: { 'country.name': value } },
                  { match: { 'country.slug': value } }
                ]
              }
            }
          }
        });
      } else if (key === 'type') {
        searchBody.query.bool.filter.push({ term: { type: value } });
      } else if (key === 'status') {
        searchBody.query.bool.filter.push({ term: { status: value } });
      }
    });
  }
  
  // Nếu không có câu truy vấn chính, lấy tất cả các bộ phim
  if (searchBody.query.bool.must.length === 0 && searchBody.query.bool.filter.length === 0) {
    searchBody.query = { match_all: {} };
  }
  
  // Sắp xếp kết quả
  searchBody.sort = [
    "_score",
    { "tmdb.vote_average": { "order": "desc" } },
    { "view": { "order": "desc" } }
  ];
  
  return searchBody;
}

/**
 * Lấy gợi ý tìm kiếm từ Elasticsearch
 * @param {string} query - Từ khóa tìm kiếm 
 * @param {number} limit - Số lượng gợi ý tối đa
 * @returns {Promise<Array>} - Danh sách gợi ý
 */
async function getSuggestions(query, limit = 10) {
  if (!client) {
    debugLog('Elasticsearch client not initialized for suggestions');
    return [];
  }
  if (!query || query.trim().length < 1) return [];

  // Sử dụng trực tiếp từ khóa gốc, không qua tiền xử lý phức tạp
  const originalQuery = query.trim();
  
  try {
    // Xây dựng truy vấn để lấy gợi ý với nhiều chiến lược khác nhau
    const searchParams = {
      index: INDEX_NAME,
      size: Math.min(50, limit * 5), // Lấy nhiều kết quả hơn để có nhiều gợi ý
      body: {
        query: {
          bool: {
            should: [
              // Tìm tên phim bắt đầu với từ khóa (độ ưu tiên cao nhất)
              {
                match_phrase_prefix: {
                  name: {
                    query: originalQuery,
                    max_expansions: 20,
                    boost: 10
                  }
                }
              },
              // Tìm tên gốc bắt đầu với từ khóa
              {
                match_phrase_prefix: {
                  origin_name: {
                    query: originalQuery,
                    max_expansions: 15,
                    boost: 8
                  }
                }
              },
              // Tìm tên phim chứa từ khóa (fuzzy matching)
              {
                match: {
                  name: {
                    query: originalQuery,
                    fuzziness: "AUTO",
                    boost: 6
                  }
                }
              },
              // Tìm tên gốc chứa từ khóa
              {
                match: {
                  origin_name: {
                    query: originalQuery,
                    fuzziness: "AUTO",
                    boost: 5
                  }
                }
              },
              // Tìm trong diễn viên
              {
                match_phrase_prefix: {
                  actor: {
                    query: originalQuery,
                    max_expansions: 10,
                    boost: 4
                  }
                }
              },
              // Tìm trong đạo diễn
              {
                match_phrase_prefix: {
                  director: {
                    query: originalQuery,
                    max_expansions: 10,
                    boost: 4
                  }
                }
              },
              // Tìm wildcard cho các trường hợp đặc biệt
              {
                wildcard: {
                  name: {
                    value: `*${originalQuery.toLowerCase()}*`,
                    boost: 3
                  }
                }
              }
            ]
          }
        },
        _source: ["name", "origin_name", "slug", "actor", "director", "category", "country"],
        sort: [
          "_score",
          { "view": { "order": "desc" } }
        ]
      }
    };

    debugLog('Suggestions search params:', JSON.stringify(searchParams, null, 2));
    const response = await client.search(searchParams);
    
    // Tạo danh sách gợi ý với thứ tự ưu tiên
    const suggestions = [];
    const suggestionSet = new Set(); // Để tránh trùng lặp
    
    // Xử lý kết quả từ Elasticsearch
    response.body.hits.hits.forEach(hit => {
      const source = hit._source;
      
      // 1. Thêm tên phim (ưu tiên cao nhất)
      if (source.name && !suggestionSet.has(source.name.toLowerCase())) {
        suggestions.push({
          text: source.name,
          type: 'movie',
          score: hit._score,
          slug: source.slug
        });
        suggestionSet.add(source.name.toLowerCase());
      }
      
      // 2. Thêm tên gốc nếu khác tên phim
      if (source.origin_name && 
          source.origin_name !== source.name &&
          !suggestionSet.has(source.origin_name.toLowerCase())) {
        suggestions.push({
          text: source.origin_name,
          type: 'original_name',
          score: hit._score * 0.8,
          slug: source.slug
        });
        suggestionSet.add(source.origin_name.toLowerCase());
      }
      
      // 3. Thêm diễn viên nếu phù hợp với từ khóa
      if (source.actor && typeof source.actor === 'string' && originalQuery.length >= 2) {
        const actorNames = source.actor.split(',')
          .map(a => a.trim())
          .filter(a => a.toLowerCase().includes(originalQuery.toLowerCase()) && 
                      a.length <= 50 && 
                      !suggestionSet.has(a.toLowerCase()));
        
        actorNames.forEach(actor => {
          if (actor.length > 1) {
            suggestions.push({
              text: actor,
              type: 'actor',
              score: hit._score * 0.6
            });
            suggestionSet.add(actor.toLowerCase());
          }
        });
      }
      
      // 4. Thêm đạo diễn nếu phù hợp với từ khóa
      if (source.director && typeof source.director === 'string' && originalQuery.length >= 2) {
        const directorNames = source.director.split(',')
          .map(d => d.trim())
          .filter(d => d.toLowerCase().includes(originalQuery.toLowerCase()) && 
                      d.length <= 50 && 
                      !suggestionSet.has(d.toLowerCase()));
        
        directorNames.forEach(director => {
          if (director.length > 1) {
            suggestions.push({
              text: director,
              type: 'director',
              score: hit._score * 0.6
            });
            suggestionSet.add(director.toLowerCase());
          }
        });
      }
    });
    
    // 5. Thêm gợi ý thông minh cho từ khóa ngắn
    if (originalQuery.length <= 3) {
      const smartSuggestions = [];
      const lowerQuery = originalQuery.toLowerCase();
      
      if (lowerQuery.startsWith('ph')) smartSuggestions.push('Phim hành động', 'Phim tình cảm', 'Phim kinh dị');
      if (lowerQuery.startsWith('ha')) smartSuggestions.push('Hành động', 'Hài hước');
      if (lowerQuery.startsWith('ki')) smartSuggestions.push('Kinh dị');
      if (lowerQuery.startsWith('ti')) smartSuggestions.push('Tình cảm');
      if (lowerQuery.startsWith('ho')) smartSuggestions.push('Hoạt hình', 'Hài hước');
      if (lowerQuery.startsWith('vi')) smartSuggestions.push('Viễn tưởng');
      if (lowerQuery.startsWith('co')) smartSuggestions.push('Cổ trang');
      if (lowerQuery.startsWith('vo')) smartSuggestions.push('Võ thuật');
      if (lowerQuery.startsWith('ch')) smartSuggestions.push('Chiến tranh');
      if (lowerQuery.startsWith('am')) smartSuggestions.push('Âm nhạc');
      
      smartSuggestions.forEach(suggestion => {
        if (!suggestionSet.has(suggestion.toLowerCase())) {
          suggestions.push({
            text: suggestion,
            type: 'category',
            score: 1
          });
          suggestionSet.add(suggestion.toLowerCase());
        }
      });
    }
    
    // Sắp xếp theo điểm số và loại
    suggestions.sort((a, b) => {
      // Ưu tiên theo loại: movie > original_name > category > actor > director
      const typeOrder = { movie: 5, original_name: 4, category: 3, actor: 2, director: 1 };
      const aOrder = typeOrder[a.type] || 0;
      const bOrder = typeOrder[b.type] || 0;
      
      if (aOrder !== bOrder) return bOrder - aOrder;
      return b.score - a.score;
    });
    
    // Trả về chỉ text của gợi ý, giới hạn số lượng
    const finalSuggestions = suggestions.slice(0, limit).map(s => s.text);
    
    debugLog(`Generated ${finalSuggestions.length} suggestions for query "${originalQuery}":`, finalSuggestions);
    return finalSuggestions;
    
  } catch (error) {
    console.error('Error in getSuggestions:', error);
    return [];
  }
}

// Export các hàm cần thiết để sử dụng ở nơi khác trong ứng dụng
module.exports = {
  initClient, // Hàm để gọi khi khởi động app
  client: () => { // Hàm để lấy client instance (nếu cần truy cập trực tiếp)
      if (!client) throw new Error('Elasticsearch client not initialized');
      return client;
  },
  createIndexIfNotExists,
  indexDocument,
  deleteDocument,
  searchMovies,
  preprocessQuery, // Export thêm hàm tiền xử lý để có thể sử dụng riêng nếu cần
  filterByDuration, // Export hàm lọc theo độ dài
  getSuggestions, // Export hàm lấy gợi ý tìm kiếm
  INDEX_NAME
};