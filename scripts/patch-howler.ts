import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const marker = '// Quizmon: recover from rejected AudioContext.resume().';

export function patchHowler(source: string): string {
  if (source.includes(marker)) return source;
  const replace = (before: string, after: string) => {
    if (source.split(before).length !== 2) {
      throw new Error('Howler 2.2.4 audio patch no longer matches its source');
    }
    source = source.replace(before, after);
  };

  replace(
    `        if (typeof self.ctx.resume === 'function') {
          self.ctx.resume();`,
    `        var unlockContext = self.ctx;
        if (typeof unlockContext.resume === 'function') {
          unlockContext.resume().catch(function(error) {
            source.onended = null;
            source.disconnect(0);
            if (self.ctx === unlockContext && unlockContext.state !== 'running') {
              self._resumeFailed(error);
            }
          });`,
  );
  replace(
    '          // Update the unlocked state and prevent this check from happening again.',
    `          if (self.ctx !== unlockContext || self.ctx.state !== 'running') return;

          // Update the unlocked state and prevent this check from happening again.`,
  );
  replace(
    `        self.ctx.resume().then(function() {
          self.state = 'running';`,
    `        var context = self.ctx;
        context.resume().then(function() {
          if (self.ctx !== context || context.state !== 'running') return;
          self.state = 'running';`,
  );
  replace(
    `            self._howls[i]._emit('resume');
          }
        });`,
    `            self._howls[i]._emit('resume');
          }
        }, function(error) {
          if (self.ctx === context && context.state !== 'running') {
            self._resumeFailed(error);
          }
        });`,
  );
  replace(
    '    _autoResume: function() {',
    `    ${marker}
    _resumeFailed: function(error) {
      var self = this;
      self.state = self.ctx.state;
      for (var i=0; i<self._howls.length; i++) {
        var howl = self._howls[i];
        if (!howl._webAudio || !howl._playLock) continue;
        howl._playLock = false;
        // Discard failed plays while retaining queued stop/mute/volume changes.
        howl._queue = howl._queue.filter(function(task) { return task.event !== 'play'; });
        howl.stop();
        howl._loadQueue();
        howl._emit('playerror', null, error);
      }
      if (self._audioUnlocked) {
        self._audioUnlocked = false;
        self._unlockAudio();
      }
    },

    _autoResume: function() {`,
  );
  replace(
    '        var playWebAudio = function() {',
    `        var playId = sound._id;
        var playWebAudio = function() {
          if (sound._resumeFn === playWebAudio) delete sound._resumeFn;
          if (self._state !== 'loaded' || sound._ended || sound._id !== playId) return;`,
  );
  replace(
    "          self.once('resume', playWebAudio);",
    `          sound._resumeFn = playWebAudio;
          self.once('resume', playWebAudio);`,
  );
  replace(
    `    stop: function(id, internal) {
      var self = this;`,
    `    stop: function(id, internal) {
      var self = this;
      if (self._webAudio && self._state === 'loaded') {
        var stopIds = self._getSoundIds(id);
        for (var j=0; j<stopIds.length; j++) {
          var pending = self._soundById(stopIds[j]);
          if (pending) {
            if (pending._resumeFn) self.off('resume', pending._resumeFn);
            delete pending._resumeFn;
            if (pending._paused) pending._ended = true;
          }
        }
        self._playLock = self._sounds.some(function(sound) {
          return !!sound._resumeFn;
        });
      }`,
  );
  return source;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const require = createRequire(import.meta.url);
  const { version } = require('howler/package.json') as { version: string };
  if (version !== '2.2.4')
    throw new Error('Review the Howler audio patch before upgrading');
  const path = require.resolve('howler');
  const source = readFileSync(path, 'utf8');
  const patched = patchHowler(source);
  if (patched !== source) writeFileSync(path, patched);
}
