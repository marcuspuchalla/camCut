<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

/**
 * One-time own-risk acknowledgement, shown before a user first reaches any
 * camera or viewer screen (App.vue mounts it on those routes only).
 *
 * Wording rules (see the legal comment in Nutzungsbedingungen.vue and
 * CLAUDE.md §2/§3): this INSTRUCTS the user — it does not exclude liability
 * (a blanket exclusion is void under § 309 Nr. 7a BGB and would backfire),
 * and it must never claim the app is safe, reliable, or that it monitors
 * anything. It states what the app is: a way to look, nothing more.
 */

const ACK_KEY = "bcc.ownRiskAck";
const ACK_VERSION = "1";

function loadAck(): boolean {
  try {
    return localStorage.getItem(ACK_KEY) === ACK_VERSION;
  } catch {
    return false; // storage blocked → shown each visit, which is fine
  }
}

const acked = ref(loadAck());

function accept() {
  acked.value = true;
  try {
    localStorage.setItem(ACK_KEY, ACK_VERSION);
  } catch {
    /* storage blocked — acknowledged for this visit */
  }
}
</script>

<template>
  <div
    v-if="!acked"
    class="fixed inset-0 z-[70] bg-night-800/95 backdrop-blur-sm overflow-y-auto"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="frn-title"
  >
    <div class="min-h-full grid place-items-center px-5 py-8">
      <div class="w-full max-w-md rounded-2xl border border-glow-b/40 bg-night-700 p-6">
        <h2 id="frn-title" class="font-round font-bold text-xl mt-0 mb-3 text-[#ffd6d8]">
          Before you use Baby Cam Cut
        </h2>
        <div class="text-sm leading-relaxed text-moon flex flex-col gap-3">
          <p class="m-0">
            This app only sends live picture and sound from one of your devices to another — a way for
            <em>you</em> to look and listen. <strong>It does not watch your child for you</strong>, not
            automatically and not continuously. It doesn't understand what's in the picture: it detects no
            breathing, no movement, no crying, no danger. It is not a medical or safety device.
          </p>
          <p class="m-0">
            <strong>The stream can stop at any time without warning</strong> — network trouble, an empty
            battery, the operating system stepping in — <strong>and the failure may not be shown to you.</strong>
          </p>
          <p class="m-0">
            You use it at your own risk, as a convenience for healthy children. It never replaces having an
            adult nearby — never leave your child alone relying on this or any other technology.
          </p>
          <p class="m-0 text-muted text-xs">
            Details in the
            <RouterLink to="/nutzungsbedingungen" class="text-[#ffd0a8]">Nutzungsbedingungen</RouterLink>.
          </p>
        </div>
        <button
          class="mt-5 w-full rounded-xl bg-glow-a text-night-800 font-round font-bold px-5 py-3"
          @click="accept"
        >
          I understand — it's a convenience, not a safety device
        </button>
      </div>
    </div>
  </div>
</template>
