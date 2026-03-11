import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette } from '@jupyterlab/apputils';

import { Notification } from '@jupyterlab/apputils';


// import { PromiseDelegate, ReadonlyJSONValue } from '@lumino/coreutils';
import { INotebookTracker } from '@jupyterlab/notebook';

import { PageConfig } from '@jupyterlab/coreutils';

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


    const match = PageConfig.getBaseUrl().match(/\/notebook\/([^/]+)/);

    const uname = match ? match[1] : "unknown";

    const username =
      PageConfig.getOption('hubUser') ||
      PageConfig.getOption('user') ||
      uname;

    console.log("Detected user:", username);

    console.log("Current user:", username);
    console.log('base url:', PageConfig.getBaseUrl());

    let pendingPodsInterval: number | null = null;
    let pendingNotificationId: string | undefined;
    let lastPendingCount: number | null = null;


    startPendingPodsWatcher(username);

    notebooks.currentChanged.connect((_, panel) => {

      if (panel) {
        const sessionContext = panel.sessionContext;

        sessionContext.statusChanged.connect((_, status) => {
          if (status === 'starting') {
            const kernelId = sessionContext.session?.kernel?.id;

            if (kernelId) {
              console.log(`[Official API] Kernel ID : ${kernelId}`);
            }
          }
        });
      }
      console.log("Current notebook changed:", panel);
    });

    /*
    // Listen for new notebooks
    notebooks.widgetAdded.connect(
      (sender: INotebookTracker, notebookPanel: NotebookPanel) => {

        console.log("Notebook opened:", notebookPanel.id);
        console.log(sender);
        let firstKernelEvent = true;

        notebookPanel.sessionContext.kernelChanged.connect((_, args) => {
          // Use args.newValue to get the kernel model before it's fully 'ready'
          const kernelModel = args.newValue;

          if (kernelModel && kernelModel.id) {
            console.log("Gateway assigned Kernel ID:", kernelModel.id);
            checkKernelStatus(kernelModel.id);
          }

          const kernel = notebookPanel.sessionContext.session?.kernel;

          console.log("Kernel changed event detected");
          console.log("Current kernel:", kernel);

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

        const session = notebookPanel.sessionContext;

        session.kernelPreferenceChanged.connect((_, pref) => {

          console.log("Kernel preference changed");
          console.log("Kernel spec:", pref);

          console.log("Selected kernel name:", pref.name);
          console.log("Selected kernel name:", pref.newValue.name);
          console.log("Selected kernel language:", pref.newValue.language);

          // Example: gpu-8gb kernel spec
          const kernelSpec = pref.newValue.name;

          if (kernelSpec) {
            checkKernelSpec(kernelSpec);
          }

          console.log("Kernel preference change event handled fired");

        });


        // This fires when the user confirms a choice in the dialog, 
        // even before the server responds with a 201 Created.
        session.kernelPreferenceChanged.connect((sender, pref) => {
          // 'pref' contains the newValue and oldValue
          const selectedKernelName = pref.newValue.name;

          if (selectedKernelName) {
            console.log("User clicked 'Select' for spec:", selectedKernelName);

            // 1. Check if resources are available for this spec immediately
            checkKernelSpec(selectedKernelName);

            // 2. Since the kernel ID isn't born yet, we wait for the NEXT kernelChange
            // to grab the ID assigned by Enterprise Gateway.
          }
        });


      }
    );
    */


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

    /*
        async function checkKernelStatus(kernelId: string) {
    
          let notifiedPending = false;
          let completed = false;
          let pendingNotificationId: string | undefined;
    
          const username =
            PageConfig.getOption('user') ||
            PageConfig.getOption('hubUser');
    
          console.log("Current user:", username);
    
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          const apiPort = 30901;
    
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
    
              if (data.status === "Running" || data.status === "Starting" && !completed) {
    
                if (pendingNotificationId) {
                  Notification.dismiss(pendingNotificationId);
                }
                // Clear previous notifications
                Notification.dismiss();
    
    
                Notification.success("Kernel is running...", {
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
    
                console.error("Kernel failed to start or pod wasn't found, skipping any further actions. Status:", data.status);
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
        
    
        async function checkKernelSpec(kernelSpec: string) {
    
          console.log("Checking kernel spec:", kernelSpec);
    
    
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          const apiPort = 30901;
    
          const apiBase = `${protocol}//${hostname}:${apiPort}`;
    
    
          try {
    
            const response = await fetch(
              `${apiBase}/api/kernel-spec/${kernelSpec}`
            );
    
            if (!response.ok) {
              throw new Error("API request failed");
            }
    
            const data = await response.json();
    
            console.log("Kernel spec response:", data);
    
            if (data.status === "quota_exceeded" || data.status === "pending" || data.status === "cluster_busy" || data.status === "no_resources") {
    
              Notification.error(
                `❌ GPU quota exceeded OR ⏳ No GPU resources available. Kernel may remain pending.`,
                { autoClose: 5000 }
              );
    
            }
    
            else if (data.status === "ok") {
    
              Notification.success(
                `✅ Kernel request accepted (${data.requested} VRAM)`,
                { autoClose: 3000 }
              );
    
            }
    
          } catch (error) {
    
            console.error("Kernel spec check failed:", error);
    
            Notification.warning(
              "⚠️ Could not verify kernel resources.",
              { autoClose: 3000 }
            );
    
          }
    
        }
    */
    function startPendingPodsWatcher(username: string) {

      if (pendingPodsInterval) {
        return; // already running
      }

      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const apiPort = 30901;

      const apiBase = `${protocol}//${hostname}:${apiPort}`;

      pendingPodsInterval = window.setInterval(async () => {

        try {

          const response = await fetch(
            `${apiBase}/api/user-pending-pods/${username}`
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          const pending = data.pending;
          // const total = data.total;

          // console.log("User pending pods:", pending);
          // console.log("Total pods:", total);
          // If value didn't change -> do nothing
          if (pending === lastPendingCount) {
            return;
          }

          lastPendingCount = pending;

          if (pending > 0) {

            if (!pendingNotificationId) {

              pendingNotificationId = Notification.info(
                `⏳ You currently have ${pending} GPU kernel(s) waiting for resources.`,
                { autoClose: false }
              );

            } else {

              Notification.dismiss(pendingNotificationId);
              pendingNotificationId = Notification.info(
                `⏳ You currently have ${pending} GPU kernel(s) waiting for resources.`,
                { autoClose: false }
              );

            }

          } else {

            if (pendingNotificationId) {
              Notification.dismiss(pendingNotificationId);
              pendingNotificationId = undefined;
            }

          }

        } catch (err) {

          console.error("Pending pods check failed:", err);

        }

      }, 5000); // every 5 seconds
    }

    /*
      function stopPendingPodsWatcher() {
  
        if (pendingPodsInterval) {
          clearInterval(pendingPodsInterval);
          pendingPodsInterval = null;
        }
  
        if (pendingNotificationId) {
          Notification.dismiss(pendingNotificationId);
          pendingNotificationId = undefined;
        }
  
      }
    */


    palette.addItem({
      command,
      category: 'Notifications'
    });
    // app.commands.execute('examples-notifications:notify');
  }

};

export default plugin;
