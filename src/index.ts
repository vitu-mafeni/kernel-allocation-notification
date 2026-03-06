import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';

import { Notification } from '@jupyterlab/apputils';


// import { PromiseDelegate, ReadonlyJSONValue } from '@lumino/coreutils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

// import { PageConfig } from '@jupyterlab/coreutils';

/**
 * Initialization data for the kernel-allocation-notification extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'kernel-allocation-notification:plugin',
  description: 'kernel-allocation-notification',
  autoStart: true,
  requires: [ICommandPalette, INotebookTracker],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, notebooks: INotebookTracker) => {
    console.log('kernel-allocation-notification extension activated');

    // Listen for new notebooks
    notebooks.widgetAdded.connect(
      (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

        console.log("Notebook opened:", notebookPanel.id);
        console.log(sender);
        let firstKernelEvent = true;

        notebookPanel.sessionContext.kernelChanged.connect(() => {

          const kernel = notebookPanel.sessionContext.session?.kernel;

          if (!kernel) {
            return;
          }

          const kernelId = kernel.id;

          console.log("Kernel started:", kernelId);
          // Skip the first kernel (initial notebook kernel)
          if (firstKernelEvent) {
            console.log("Initial kernel detected — skipping API check");
            firstKernelEvent = false;
            return;
          }
          console.log("User changed kernel:", kernelId);
          checkKernelStatus(kernelId);
        });

        // Detect restart events
        notebookPanel.sessionContext.statusChanged.connect((_, status) => {

          const kernel = notebookPanel.sessionContext.session?.kernel;

          if (!kernel) {
            return;
          }

          const kernelId = kernel.id;

          console.log("Kernel status:", status);

          if (status === "restarting") {

            console.log("Kernel restarting:", kernelId);

            Notification.info("🔄 Kernel is restarting...", {
              autoClose: 3000
            });

          }

          if (status === "starting") {

            console.log("Kernel starting:", kernelId);

            checkKernelStatus(kernelId);

          }

        });
      }
    );


    const command = 'examples-notifications:notify';

    // app.commands.addCommand(command, {
    //   label: 'Display notifications',
    //   execute: () => {
    //     // Notification.success('Congratulations, you created a notifications.');

    //     // Notification.error('Watch out something went wrong.', {
    //     //   actions: [
    //     //     { label: 'Help', callback: () => alert('This was a fake error.') }
    //     //   ],
    //     //   autoClose: 3000
    //     // });

    //     const delegate = new PromiseDelegate<ReadonlyJSONValue>();
    //     const delay = 200;

    //     setTimeout(() => {
    //       delegate.resolve({ delay });
    //     }, delay);

    //     Notification.promise(delegate.promise, {
    //       pending: { message: 'Waiting...', options: { autoClose: false } },
    //       success: {
    //         message: (result: any) =>
    //           `Action successful after ${result.delay}ms.`
    //       },
    //       error: { message: () => 'Action failed.' }
    //     });
    //   }
    // });


    async function checkKernelStatus(kernelId: string) {

      let notifiedPending = false;
      let completed = false;
      let pendingNotificationId: string | undefined;


      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const apiPort = 9000;

      const apiBase = `${protocol}//${hostname}:${apiPort}`;

      const interval = setInterval(async () => {

        try {

          console.log(`api-server-url: ${apiBase}/api/kernel-status/${kernelId}`);

          const response = await fetch(
            `${apiBase}/api/kernel-status/${kernelId}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const data = await response.json();

          console.log("Kernel status:", data);

          if (data.status === "Pending" && !notifiedPending) {

            pendingNotificationId = Notification.info(
              "⏳Waiting for resources (GPU/CPU) to be allocated...",
              { autoClose: false }
            );

            notifiedPending = true;
          }

          if (data.status === "Running" && !completed) {

            if (pendingNotificationId) {
              Notification.dismiss(pendingNotificationId);
            }
            // Clear previous notifications
            Notification.dismiss();


            Notification.success("Kernel pod successfully started.", {
              autoClose: 3000
            });

            completed = true;

            clearInterval(interval);
          }

          if (data.status === "NotFound" || data.status === "Unknown" || data.status === "Error" || data.status === "Terminated" || data.status === "Terminating" || data.status === "Crashed") {

            if (pendingNotificationId) {
              Notification.dismiss(pendingNotificationId);
            }
            // Clear previous notifications
            Notification.dismiss();


            // Notification.warning("Issue occurred while starting kernel.", {
            //   autoClose: false
            // });

            completed = true;

            clearInterval(interval);
          }

          if (data.status === "Failed") {

            if (pendingNotificationId) {
              Notification.dismiss(pendingNotificationId);
            }
            // Clear previous notifications
            Notification.dismiss();


            Notification.error("Error occurred while starting kernel.", {
              autoClose: false
            });

            completed = true;

            clearInterval(interval);
          }

        } catch (err) {

          console.error("Kernel status check failed", err);

        }

      }, 4000);
    }

    palette.addItem({
      command,
      category: 'Notifications'
    });
    // app.commands.execute('examples-notifications:notify');
  }

};

export default plugin;
