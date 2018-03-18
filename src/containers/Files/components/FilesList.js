import React, { Component } from "react"
import PropTypes from 'prop-types'
import ReactWinJS from 'react-winjs'
import WinJS from 'winjs'
import FilesItemList from './FilesItemList'
import Loader from '../../../components/Loader'
import Confirmation from '../../../components/Confirmation'

export default class FilesList extends Component {

    constructor(props) {
        super(props)
        this.state = {
            layout: { type: WinJS.UI.ListLayout },
            scrolling: false,
            isLoading: false,
            itemList: new WinJS.Binding.List([]),
            order: "ASC",
            pagination: {
                start: 0,
                page: 1,
                count: 15
            }
        }
    }

    componentDidMount() {
        this.handleRefresh()
    }

    componentDidUpdate(prevProps) {
        if (this.listView && !this.state.scrolling) {
            this.listView.winControl.footer.style.height = '1px'
        }

        if (this.props.action === "reload") {
            this.handleRefresh()
            this.props.changeAction(null)
        }

        if (prevProps.selectedItems.length > 0 && this.props.selectedItems.length === 0 && !this.props.selectionMode) {
            if (this.listView) {
                this.listView.winControl.selection.clear()
            }
        }
    }

    componentWillUnmount() {
        this.props.changeSelectionMode(false)
    }

    ItemListRenderer = ReactWinJS.reactRenderer((ItemList) => {
        return (
            <FilesItemList itemList={ItemList.data} size={42} />
        )
    })

    handleRefresh = async () => {
        try {
            this.props.history.push('/app/files')
            this.setState({
                isLoading: true,
                scrolling: false,
                pagination: {
                    start: 0,
                    page: 1,
                    count: 15
                }
            })
            const files = await this.props.glpi.searchItems({ itemtype: 'PluginFlyvemdmFile', options: { uid_cols: true, forcedisplay: [1, 2, 3], order: this.state.order, range: `${this.state.pagination.start}-${(this.state.pagination.count * this.state.pagination.page) - 1}` } })
            this.setState({
                isLoading: false,
                order: files.order,
                itemList: new WinJS.Binding.List(files.data)
            })

        } catch (error) {
            this.setState({
                isLoading: false,
                order: "ASC"
            })
        }
    }

    handleEdit = () => {
        this.props.history.push('/app/files/edit')
    }

    handleAdd = (eventObject) => {
        this.props.history.push("/app/files/add")
        this.props.changeSelectionMode(false)
        this.props.changeSelectedItems([])
        this.listView.winControl.selection.clear()
    }

    handleToggleSelectionMode = () => {
        this.props.history.push('/app/files')
        this.props.changeSelectionMode(!this.props.selectionMode)
        this.props.changeSelectedItems([])
        this.listView.winControl.selection.clear()
    }

    handleSelectionChanged = (eventObject) => {
        let listView = eventObject.currentTarget.winControl
        let index = listView.selection.getIndices()
        let itemSelected = []

        for (const item of index) {
            itemSelected.push(this.state.itemList.getItem(item).data)
        }
        this.props.changeSelectedItems(itemSelected)
        if (index.length === 1 && !this.props.selectionMode) {
            this.props.history.push(`/app/files/${itemSelected[0]["PluginFlyvemdmFile.id"]}`)
        }
        if (index.length > 1 && !this.props.selectionMode) {
            this.props.history.push('/app/files/edit/')
        }
    }

    handleDelete = async (eventObject) => {
        try {
            const isOK = await Confirmation.isOK(this.contentDialog)
            if (isOK) {

                let itemListToDelete = this.props.selectedItems.map((item) => {
                    return {
                        id: item["PluginFlyvemdmFile.id"]
                    }
                })

                this.setState({
                    isLoading: true
                })

                await this.props.glpi.deleteItem({ itemtype: 'PluginFlyvemdmFile', input: itemListToDelete, queryString: { force_purge: true } })

                this.props.setNotification({
                    title: 'Successfully',
                    body: 'Device successfully removed!',
                    type: 'success'
                })
                this.props.changeSelectionMode(false)
                this.props.changeSelectedItems([])
                this.props.changeAction('reload')

                this.setState((prevState, props) => ({
                    isLoading: false
                }))
            } else {
                // Exit selection mode
                this.props.changeSelectionMode(false)
                this.props.changeSelectedItems([])

                this.listView.winControl.selection.clear()
            }

        } catch (error) {
            if (error.length > 1) {

                this.props.setNotification({
                    title: error[0],
                    body: error[1],
                    type: 'alert'
                })
            }

            this.props.changeSelectionMode(false)
            this.props.changeSelectedItems([])

            this.setState((prevState, props) => ({
                isLoading: false
            }))
        }
    }

    handleSort = async () => {
        try {
            this.setState({
                isLoading: true,
                pagination: {
                    start: 0,
                    page: 1,
                    count: 15
                }
            })
            let newOrder = this.state.order === 'ASC' ? 'DESC' : 'ASC'

            const files = await this.props.glpi.searchItems({ itemtype: 'PluginFlyvemdmFile', options: { uid_cols: true, order: newOrder, forcedisplay: [1, 2, 3] } })

            this.setState({
                isLoading: false,
                order: files.order,
                itemList: new WinJS.Binding.List(files.data)
            })
            this.props.history.push('/app/files')

        } catch (error) {
            this.setState({
                isLoading: false,
                order: "ASC"
            })
        }
    }

    onLoadingStateChanged = (eventObject) => {
        if (eventObject.detail.scrolling === true) {
            setTimeout(() => {
                this.setState({
                    scrolling: true
                })
            }, 0)
        }
    }

    showFooterList = (eventObject) => {
        let listView = eventObject.currentTarget.winControl
        if (eventObject.detail.visible && this.state.scrolling) {
            listView.footer.style.height = '100px'
            this.loadMoreData()
        }
    }

    loadMoreData = async () => {
        try {
            const files = await this.props.glpi.searchItems({ itemtype: 'PluginFlyvemdmFile', options: { uid_cols: true, forcedisplay: [1, 2, 3], order: this.state.order, range: `${this.state.pagination.count * this.state.pagination.page}-${(this.state.pagination.count * (this.state.pagination.page + 1)) - 1}` } })
            for (const item in files.data) {
                this.state.itemList.push(files.data[item])
            }

            this.setState({
                pagination: {
                    ...this.state.pagination,
                    page: this.state.pagination.page + 1
                }
            })

            this.listView.winControl.footer.style.height = '1px'

        } catch (error) {
            this.listView.winControl.footer.style.height = '1px'
        }
    }

    render() {
        let deleteCommand = (
            <ReactWinJS.ToolBar.Button
                key="delete"
                icon="delete"
                priority={0}
                disabled={this.props.selectedItems.length === 0}
                onClick={this.handleDelete}
            />
        )

        let editCommand = (
            <ReactWinJS.ToolBar.Button
                key="edit"
                icon="edit"
                label="Edit"
                priority={0}
                disabled={this.props.selectedItems.length === 0}
                onClick={this.handleEdit}
            />
        )

        let listComponent = <Loader count={3} />

        if (!this.state.isLoading && this.state.itemList.length > 0) {
            listComponent = (
                <ReactWinJS.ListView
                    ref={(listView) => { this.listView = listView }}
                    onLoadingStateChanged={this.onLoadingStateChanged}
                    className="contentListView win-selectionstylefilled"
                    style={{ height: 'calc(100% - 48px)' }}
                    itemDataSource={this.state.itemList.dataSource}
                    layout={this.state.layout}
                    itemTemplate={this.ItemListRenderer}
                    footerComponent={<Loader />}
                    onFooterVisibilityChanged={this.showFooterList}
                    selectionMode={this.props.selectionMode ? 'multi' : 'single'}
                    tapBehavior={this.props.selectionMode ? 'toggleSelect' : 'directSelect'}
                    onSelectionChanged={this.handleSelectionChanged}
                />
            )
        }

        return (
            <React.Fragment>
                <ReactWinJS.ToolBar className="listToolBar">
                    <ReactWinJS.ToolBar.Button
                        key="sort"
                        icon="sort"
                        label="Sort"
                        priority={1}
                        onClick={this.handleSort}
                    />
                    <ReactWinJS.ToolBar.Button
                        key="refresh"
                        icon="refresh"
                        label="Refresh"
                        priority={1}
                        onClick={this.handleRefresh}
                    />

                    <ReactWinJS.ToolBar.Button
                        key="add"
                        icon="add"
                        label="Add"
                        priority={0}
                        onClick={this.handleAdd}
                    />

                    {this.props.selectionMode ? editCommand : null}
                    {this.props.selectionMode ? deleteCommand : null}

                    <ReactWinJS.ToolBar.Toggle
                        key="select"
                        icon="bullets"
                        label="Select"
                        priority={0}
                        selected={this.props.selectionMode}
                        onClick={this.handleToggleSelectionMode}
                    />
                </ReactWinJS.ToolBar>
                { listComponent }
                <Confirmation title={`Delete files`} message={this.props.selectedItems.length + ` files` } reference={el => this.contentDialog = el} />
            </React.Fragment>
        )
    }
}
FilesList.propTypes = {
    selectedItems: PropTypes.array.isRequired,
    changeSelectedItems: PropTypes.func.isRequired,
    selectionMode: PropTypes.bool.isRequired,
    history: PropTypes.object.isRequired,
    changeSelectionMode: PropTypes.func.isRequired,
    action: PropTypes.string,
    changeAction: PropTypes.func.isRequired,
    setNotification: PropTypes.func.isRequired,
    glpi: PropTypes.object.isRequired
}
