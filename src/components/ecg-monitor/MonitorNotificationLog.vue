<script setup lang="ts">
import { useEcgMonitorStore } from '@/stores/ecg-monitor'

const store = useEcgMonitorStore()

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="monitor-notification-bar">
    <button class="monitor-notification-toggle" @click="store.toggleNotificationLog()">
      Notifications
      <span v-if="store.notifications.length > 0" class="monitor-notification-badge">
        {{ store.notifications.length }}
      </span>
    </button>

    <div v-if="store.notificationLogOpen" class="monitor-notification-list">
      <div
        v-for="notif in store.notifications"
        :key="notif.id"
        class="monitor-notification-entry"
      >
        <span>{{ formatTime(notif.timestamp) }}</span>
        <span>{{ notif.patientId }}</span>
        <span
          class="monitor-urgency-badge"
          :class="{
            'is-routine': notif.urgency === 'routine',
            'is-urgent': notif.urgency === 'urgent',
            'is-critical': notif.urgency === 'critical',
          }"
        >{{ notif.urgency }}</span>
        <span>{{ notif.finding }}</span>
        <span v-if="notif.technicianNote">— {{ notif.technicianNote }}</span>
      </div>

      <div v-if="store.notifications.length === 0" class="monitor-empty-state">
        No notifications sent yet.
      </div>
    </div>
  </div>
</template>
