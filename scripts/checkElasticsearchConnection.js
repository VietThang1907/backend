#!/usr/bin/env node

/**
 * Script kiểm tra kết nối và trạng thái Elasticsearch
 */

require('dotenv').config();
const { initClient } = require('../src/services/elasticsearchService');

async function checkElasticsearchConnection() {
  try {
    console.log('🔍 Đang kiểm tra kết nối Elasticsearch...');
    console.log(`📡 Node: ${process.env.ELASTICSEARCH_NODE}`);

    // Khởi tạo client
    const client = await initClient();
    
    if (!client) {
      console.log('❌ Không thể khởi tạo Elasticsearch client');
      return false;
    }

    console.log('✅ Đã khởi tạo Elasticsearch client');

    // Kiểm tra thông tin cluster
    const info = await client.info();
    console.log('📊 Thông tin Elasticsearch:');
    console.log(`   - Version: ${info.version.number}`);
    console.log(`   - Cluster: ${info.cluster_name}`);
    console.log(`   - Node: ${info.name}`);

    // Kiểm tra health cluster
    const health = await client.cluster.health();
    console.log('🏥 Tình trạng cluster:');
    console.log(`   - Status: ${health.status}`);
    console.log(`   - Nodes: ${health.number_of_nodes}`);
    console.log(`   - Data nodes: ${health.number_of_data_nodes}`);

    // Kiểm tra index search-ykka
    try {
      const indexExists = await client.indices.exists({ index: 'search-ykka' });
      if (indexExists) {
        console.log('✅ Index "search-ykka" đã tồn tại');
        
        // Lấy thông tin mapping
        const mapping = await client.indices.getMapping({ index: 'search-ykka' });
        console.log('📋 Mapping của index "search-ykka" đã được thiết lập');
        
        // Đếm documents
        const count = await client.count({ index: 'search-ykka' });
        console.log(`📊 Số lượng documents trong index: ${count.count}`);
      } else {
        console.log('⚠️  Index "search-ykka" chưa tồn tại');
      }
    } catch (indexError) {
      console.log('❌ Lỗi khi kiểm tra index:', indexError.message);
    }

    return true;

  } catch (error) {
    console.error('💥 Lỗi kết nối Elasticsearch:', error.message);
    
    if (error.meta) {
      console.error('📝 Chi tiết lỗi:', {
        statusCode: error.meta.statusCode,
        headers: error.meta.headers,
        body: error.meta.body
      });
    }

    // Gợi ý khắc phục
    console.log('\n💡 Gợi ý khắc phục:');
    console.log('1. Kiểm tra ELASTICSEARCH_NODE trong .env file');
    console.log('2. Kiểm tra ELASTICSEARCH_USERNAME và ELASTICSEARCH_PASSWORD');
    console.log('3. Hoặc thiết lập ELASTICSEARCH_API_KEY');
    console.log('4. Đảm bảo Elastic Cloud cluster đang chạy');
    console.log('5. Kiểm tra firewall và network connectivity');

    return false;
  }
}

// Chạy script
if (require.main === module) {
  checkElasticsearchConnection()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Kết nối Elasticsearch thành công!');
        process.exit(0);
      } else {
        console.log('\n❌ Kết nối Elasticsearch thất bại!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Script thất bại:', error);
      process.exit(1);
    });
}

module.exports = { checkElasticsearchConnection };
