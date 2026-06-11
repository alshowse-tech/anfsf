import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Websocket 内容流推送组件 from '../pages/websocket 内容流推送组件';
import Tts 逐词高亮播放器 from '../pages/tts 逐词高亮播放器';
import 三阶段 ui 主题切换器 from '../pages/三阶段 ui 主题切换器';
import 中断提问输入界面 from '../pages/中断提问输入界面';
import 家长仪表盘 from '../pages/家长仪表盘';
import 核心学习循环 from '../pages/核心学习循环';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/websocket-内容流推送组件" element={<Websocket 内容流推送组件 />} />
      <Route path="/tts-逐词高亮播放器" element={<Tts 逐词高亮播放器 />} />
      <Route path="/三阶段-ui-主题切换器" element={<三阶段 ui 主题切换器 />} />
      <Route path="/中断提问输入界面" element={<中断提问输入界面 />} />
      <Route path="/家长仪表盘" element={<家长仪表盘 />} />
      <Route path="/核心学习循环" element={<核心学习循环 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
