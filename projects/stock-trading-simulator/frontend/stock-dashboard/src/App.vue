<template>
  <div id="app">
    <el-container>
      <!-- Sidebar -->
      <el-aside width="200px" class="sidebar">
        <div class="logo">
          <h3>📈 股票操盘</h3>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/">
            <el-icon><Monitor /></el-icon>
            <span>实时监控</span>
          </el-menu-item>
          <el-menu-item index="/rules">
            <el-icon><Document /></el-icon>
            <span>规则命中</span>
          </el-menu-item>
          <el-menu-item index="/backtest">
            <el-icon><TrendCharts /></el-icon>
            <span>回测对比</span>
          </el-menu-item>
          <el-menu-item index="/diagnostics">
            <el-icon><Search /></el-icon>
            <span>个股诊断</span>
          </el-menu-item>
          <el-menu-item index="/audit">
            <el-icon><Notebook /></el-icon>
            <span>审计日志</span>
          </el-menu-item>
          <el-menu-item index="/alerts">
            <el-icon><Bell /></el-icon>
            <span>告警中心</span>
          </el-menu-item>
          <el-menu-item index="/recommendations">
            <el-icon><DataAnalysis /></el-icon>
            <span>操盘建议</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- Main Content -->
      <el-container>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import {
  Monitor,
  Document,
  TrendCharts,
  Search,
  Notebook,
  Bell,
  DataAnalysis
} from '@element-plus/icons-vue'

const route = useRoute()
const store = useDashboardStore()
const activeMenu = computed(() => route.path)

// Initialize WebSocket on app mount
onMounted(() => {
  store.initWebSocket()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
}

.el-container {
  height: 100%;
}

.sidebar {
  background-color: #304156;
  color: #fff;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3a4b;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.el-menu {
  border-right: none;
}

.el-main {
  background-color: #f0f2f5;
  padding: 0;
  overflow-y: auto;
}

.main-content {
  min-height: 100%;
}
</style>
