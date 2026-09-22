package it.ale.medslide

import android.app.Application
import it.ale.medslide.data.DocumentRepository
import it.ale.medslide.data.MedSlideDatabase
import it.ale.medslide.sync.CloudFolderSync
import it.ale.medslide.sync.SyncScheduler
import it.ale.medslide.sync.SyncSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class MedSlideApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()

        // AndroidX PDF renders through a dedicated service process. Do not start the
        // app database/sync stack there: WorkManager is initialized only for the main app process.
        if (getProcessName() != packageName) return

        container = AppContainer(this)
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            container.repository.ensureDefaultFolders()
        }
        SyncScheduler.schedulePeriodic(this)
        SyncScheduler.syncNow(this)
    }
}

class AppContainer(application: Application) {
    private val database = MedSlideDatabase.get(application)
    val repository = DocumentRepository(application, database.dao())
    val syncSettings = SyncSettings(application)
    val sync = CloudFolderSync(application, database.dao(), syncSettings)
}
