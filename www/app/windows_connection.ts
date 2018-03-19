// Copyright 2018 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {ipcRenderer} from 'electron';
import {PromiseIpc} from 'electron-promise-ipc';
import * as errors from '../model/errors';

// TODO: Figure out the TypeScript magic to use the default, export-ed instance.
const myPromiseIpc = new PromiseIpc();

export class WindowsOutlineConnection implements cordova.plugins.outline.Connection {
  private statusChangeListener: (status: ConnectionStatus) => void;

  private running = false;

  constructor(public config: cordova.plugins.outline.ServerConfig, public id: string) {
    const serverName = this.config.name || this.config.host || '';
  }

  start(): Promise<void> {
    if (this.running) {
      return Promise.resolve();
    }

    ipcRenderer.once(`proxy-disconnected-${this.id}`, (e: Event) => {
      if (this.statusChangeListener) {
        this.running = false;
        this.statusChangeListener(ConnectionStatus.DISCONNECTED);
      } else {
        console.error(`${this.id} status changed but no listener set`);
      }
    });

    return myPromiseIpc.send('start-proxying', {config: this.config, id: this.id})
        .then(() => {
          this.running = true;
        })
        .catch((e: Error) => {
          throw new errors.OutlineNativeError(parseInt(e.message, 10));
        });
  }

  stop(): Promise<void> {
    if (!this.running) {
      return Promise.resolve();
    }

    return myPromiseIpc.send('stop-proxying').then(() => {
      this.running = false;
    });
  }

  isRunning(): Promise<boolean> {
    return Promise.resolve(this.running);
  }

  isReachable(): Promise<boolean> {
    return myPromiseIpc.send('is-reachable', this.config);
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): void {
    this.statusChangeListener = listener;
  }
}